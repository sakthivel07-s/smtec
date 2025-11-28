import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "../../contexts/AuthContext";
import { useState } from "react";

export default function Layout({ children, title }) {
    const { userRole } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 font-sans transition-colors duration-300">
            <Sidebar role={userRole} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 md:ml-64 transition-all duration-300">
                <Header title={title} onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
