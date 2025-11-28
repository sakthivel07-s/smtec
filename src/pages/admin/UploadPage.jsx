import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import ExcelUpload from "../../components/admin/ExcelUpload";
import GoogleSheetSync from "../../components/admin/GoogleSheetSync";
import { downloadSampleTemplate } from "../../utils/excelGenerator";
import { seedDatabase } from "../../utils/seed_students";
import { FileSpreadsheet, Download, CloudUpload, Database, Loader2, Wand2 } from "lucide-react";

export default function UploadPage() {
    const { userDept } = useAuth();
    const [seeding, setSeeding] = useState(false);

    const handleSeed = async () => {
        if (!confirm("This will generate sample data for ALL departments and years (Students & Alumni). Continue?")) return;
        setSeeding(true);
        try {
            await seedDatabase();
            alert("Sample data generated successfully!");
        } catch (error) {
            console.error(error);
            alert("Error generating data.");
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="space-y-8 font-sans">
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3 text-white">
                        <Database className="text-blue-500" />
                        Data Management
                    </h1>
                    <p className="text-gray-400">Manage student records via bulk upload or live sync.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSeed}
                        disabled={seeding}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50"
                    >
                        {seeding ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                        Generate Sample Data
                    </button>
                    <button
                        onClick={downloadSampleTemplate}
                        className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-xl font-semibold transition-all active:scale-95"
                    >
                        <Download size={18} />
                        Download Template
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Excel Upload Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <FileSpreadsheet className="text-green-600" size={20} />
                        <h3 className="font-bold text-gray-900 dark:text-white">Upload Student Data (Excel)</h3>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-1 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
                        <ExcelUpload />
                    </div>
                </div>

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
