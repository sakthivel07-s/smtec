import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Upload, Settings, LogOut, X, Award, GraduationCap, Trophy, Gamepad2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect, useState } from "react";

export default function Sidebar({ role, isOpen, onClose }) {
    const { logout, currentUser } = useAuth();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                onClose(); // Reset on desktop
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [onClose]);

    const links = (role === 'admin' || role === 'hod') ? [
        { to: "/admin", icon: <LayoutDashboard size={20} />, label: "Dashboard", end: true },
        { to: "/admin/students", icon: <Users size={20} />, label: "Students" },
        { to: "/admin/upload", icon: <Upload size={20} />, label: "Upload Data" },
        { to: "/admin/skills", icon: <Award size={20} />, label: "Skill Management" },
        { to: "/admin/batches", icon: <Settings size={20} />, label: "Batch Management" },
        { to: "/admin/alumni", icon: <GraduationCap size={20} />, label: "Alumni Directory" },
        { to: "/admin/leaderboard", icon: <Trophy size={20} />, label: "Leaderboard" },
    ] : [
        { to: "/student", icon: <LayoutDashboard size={20} />, label: "Overview", end: true },
        { to: "/student/results", icon: <Users size={20} />, label: "My Results" },
        { to: "/student/skills", icon: <Award size={20} />, label: "Skill Report" },
        { to: "/student/leaderboard", icon: <Trophy size={20} />, label: "Leaderboard" },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isMobile && isOpen && (
                <div
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                />
            )}

            <aside
                className={`
                    fixed top-0 left-0 h-[100dvh] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50
                    flex flex-col transition-transform duration-300 ease-in-out w-64 shadow-xl
                    ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
                `}
            >
                <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <img 
                        src="https://www.mtec.ac.in/cs-content/themes/mtec/images/logo_new.png" 
                        alt="SMTEC Logo" 
                        className="h-12 w-auto object-contain"
                    />
                    {isMobile && (
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X size={24} />
                        </button>
                    )}
                </div>

                {/* Mobile Profile Section */}
                {isMobile && currentUser && (
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-200 dark:shadow-none">
                                {currentUser.email?.[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{currentUser.email}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium capitalize">{role}</p>
                            </div>
                        </div>
                    </div>
                )}

                <nav className="flex-1 py-4 overflow-y-auto">
                    <ul className="space-y-1 px-3">
                        {links.map(link => (
                            <li key={link.to}>
                                <NavLink
                                    to={link.to}
                                    end={link.end}
                                    onClick={() => isMobile && onClose()}
                                    className={({ isActive }) => `
                                        flex items-center gap-3 px-4 py-2.5 md:py-3 rounded-xl transition-all duration-200 font-medium
                                        ${isActive
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                        }
                                    `}
                                >
                                    {link.icon}
                                    <span>{link.label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium"
                    >
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
