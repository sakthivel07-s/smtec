import SkillEntryForm from '../../components/skills/SkillEntryForm';
import SkillReportViewer from '../../components/skills/SkillReportViewer';
import { ShieldCheck } from 'lucide-react';

export default function SkillManagement() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-8 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Skill Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Manage student points and view analytics.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium w-fit shadow-lg shadow-blue-200 dark:shadow-none">
                    <ShieldCheck size={16} />
                    <span>Admin Access</span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Entry Form */}
                <div className="xl:col-span-1">
                    <SkillEntryForm />
                </div>

                {/* Right Column: Report View */}
                <div className="xl:col-span-2">
                    <SkillReportViewer />
                </div>
            </div>
        </div>
    );
}
