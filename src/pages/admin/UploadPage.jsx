import { useAuth } from "../../contexts/AuthContext";
import GoogleSheetSync from "../../components/admin/GoogleSheetSync";
import { CloudUpload, Database } from "lucide-react";

export default function UploadPage() {
    const { userDept } = useAuth();

    return (
        <div className="space-y-8 font-sans">
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3 text-white">
                        <Database className="text-blue-500" />
                        Data Management
                    </h1>
                    <p className="text-gray-400">Manage student records via live Google Sheet synchronization.</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto">
                {/* Google Sheet Sync Section */}
                {!userDept && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <CloudUpload className="text-blue-600" size={20} />
                            <h3 className="font-bold text-gray-900 dark:text-white">Two-Way Google Sheet Sync</h3>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-1 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
                            <GoogleSheetSync />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
