import { useAuth } from "../../contexts/AuthContext";
import SkillReport from "../../components/skills/SkillReport";
import { Sparkles } from "lucide-react";

export default function StudentSkills() {
    const { currentUser } = useAuth();

    return (
        <div className="max-w-7xl mx-auto space-y-8 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">My Skill Report</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Track your progress and achievements.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium w-fit shadow-lg shadow-gray-200 dark:shadow-none">
                    <Sparkles size={16} />
                    <span>Student Portal</span>
                </div>
            </div>

            <SkillReport regNo={currentUser?.uid} />
        </div>
    );
}
