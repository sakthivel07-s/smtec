import { Award, BookOpen, CheckCircle2 } from "lucide-react";

export default function StudentResults() {
    const results = [
        { subject: "Data Structures", grade: "A", credits: 4, code: "CS101" },
        { subject: "Algorithms", grade: "A+", credits: 4, code: "CS102" },
        { subject: "Database Systems", grade: "B+", credits: 3, code: "CS103" },
        { subject: "Operating Systems", grade: "A", credits: 3, code: "CS104" },
        { subject: "Computer Networks", grade: "B", credits: 3, code: "CS105" },
    ];

    const getGradeColor = (grade) => {
        if (grade.startsWith('A')) return 'bg-green-100 text-green-700 border-green-200';
        if (grade.startsWith('B')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-red-100 text-red-700 border-red-200';
    };

    return (
        <div className="space-y-8 font-sans">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Academic Results</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Semester 4 Performance</p>
                    </div>
                    <div className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold shadow-lg shadow-gray-200 dark:shadow-none">
                        GPA: 8.8
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.map((res, index) => (
                        <div key={index} className="group bg-gray-50 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-100/50 dark:hover:shadow-none">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    <BookOpen size={20} />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getGradeColor(res.grade)}`}>
                                    {res.grade}
                                </span>
                            </div>

                            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{res.subject}</h3>
                            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                <span className="font-mono">{res.code}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                <span>{res.credits} Credits</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
