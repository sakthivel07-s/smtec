import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from "../../contexts/AuthContext";
import StudentForm from './StudentForm';
import { Plus, Search, Filter, Trash2, Edit2, GraduationCap, ChevronRight, ArrowLeft, ChevronRight as ChevronIcon, Building2, Code, Globe, Cpu, Zap, Wrench, Hammer, Brain } from 'lucide-react';
import { parseNaturalLanguageQuery, isAIConfigured } from '../../utils/aiService';
import { Loader2, Sparkles } from 'lucide-react';

export default function StudentList() {
    const { userDept } = useAuth();
    // View State
    const [viewState, setViewState] = useState('departments');
    const [selectedDept, setSelectedDept] = useState(null);
    const [selectedYear, setSelectedYear] = useState(null);
    const [isAIActive, setIsAIActive] = useState(false);

    // Data State
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    // Modal State
    const [editingStudent, setEditingStudent] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);

    const allDepartments = ["CSE", "ECE", "MECH", "CIVIL", "EEE", "IT", "AI&DS"];
    const departments = userDept ? [userDept] : allDepartments;
    const years = [1, 2, 3, 4];

    // Fetch Logic
    async function fetchStudents(dept, year) {
        setLoading(true);
        try {
            const q = query(
                collection(db, "users"),
                where("role", "==", "student"),
                where("dept", "==", dept),
                where("year", "==", Number(year))
            );

            const querySnapshot = await getDocs(q);
            const list = [];
            querySnapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
            setStudents(list);
            setFilteredStudents(list);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    }

    // AI Search Handler
    const handleAISearch = async () => {
        if (!searchQuery.trim()) return;

        if (!isAIConfigured()) {
            alert("AI not configured. Add API Key to .env");
            return;
        }

        setAiLoading(true);
        try {
            // 1. Get Filters from AI
            const filters = await parseNaturalLanguageQuery(searchQuery);
            console.log("AI Filters:", filters);

            // 2. Build Query
            let constraints = [where("role", "==", "student")];

            if (filters.dept) {
                // Handle 'All' or specific dept
                if (['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS'].includes(filters.dept.toUpperCase())) {
                    constraints.push(where("dept", "==", filters.dept.toUpperCase()));
                }
            } else if (userDept) {
                constraints.push(where("dept", "==", userDept));
            }

            if (filters.year) constraints.push(where("year", "==", Number(filters.year)));

            // Note: Cloud Firestore limits inequality queries. 
            // We'll perform exact matches on DB and complex filtering (CGPA, Skills) on Client for "Power".

            const q = query(collection(db, "users"), ...constraints);
            const snapshot = await getDocs(q);
            let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 3. Advanced Client-side Filtering based on AI response
            if (filters.minCgpa) {
                results = results.filter(s => Number(s.cgpa) >= Number(filters.minCgpa));
            }
            if (filters.maxArrears !== undefined) {
                results = results.filter(s => Number(s.historyOfArrears || 0) <= Number(filters.maxArrears));
            }
            // Simple skill name match if 'skills' array exists in document (depends on schema)
            // or we might need to fetch sub-collections (too expensive for search). 
            // Let's assume basic profile filtering for now as per "Ask Your Database" which implies querying the main table.

            setStudents(results);
            setFilteredStudents(results);
            setViewState('students');
            setIsAIActive(true);
            setSelectedDept(filters.dept || 'Results');
            setSelectedYear(filters.year || 'All');

        } catch (error) {
            console.error("AI Search Error:", error);
            alert("AI could not understand the query. Try 'Show CSE students in year 3'");
        } finally {
            setAiLoading(false);
        }
    };

    // Navigation Handlers
    const handleDeptClick = (dept) => {
        setSelectedDept(dept);
        setViewState('years');
    };

    const handleYearClick = (year) => {
        setSelectedYear(year);
        setViewState('students');
        fetchStudents(selectedDept, year);
    };

    const handleBack = () => {
        if (viewState === 'students') {
            setViewState('years');
            setSearchQuery('');
            setIsAIActive(false); // Reset AI active state on back
            setStudents([]);
        } else if (viewState === 'years') {
            setViewState('departments');
            setSelectedDept(null);
        }
    };

    // Search Effect (Standard Search)
    useEffect(() => {
        if (isAIActive) return; // Don't filter AI results with standard search
        if (!searchQuery.trim()) {
            setFilteredStudents(students);
            return;
        }
        const queryLower = searchQuery.toLowerCase();
        const filtered = students.filter(student =>
            student.name?.toLowerCase().includes(queryLower) ||
            student.regNo?.toLowerCase().includes(queryLower) ||
            student.email?.toLowerCase().includes(queryLower)
        );
        setFilteredStudents(filtered);
    }, [searchQuery, students, isAIActive]);

    // Delete Logic
    async function handleDelete(id, regNo) {
        if (confirm("Are you sure you want to delete this student?")) {
            try {
                await deleteDoc(doc(db, "users", id));

                // Sync Delete to Sheet
                if (regNo) {
                    import('../../utils/sheetSync.js').then(({ deleteStudentFromSheet }) => {
                        deleteStudentFromSheet(regNo);
                    });
                }

                if (selectedDept && selectedYear) {
                    fetchStudents(selectedDept, selectedYear);
                }
            } catch (error) {
                console.error("Error deleting student:", error);
            }
        }
    }

    const handleFormSuccess = () => {
        if (viewState === 'students' && selectedDept && selectedYear) {
            fetchStudents(selectedDept, selectedYear);
        }
    };

    return (
        <div className="space-y-6 font-sans min-h-[600px]">
            {/* Header & Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
                <div className="flex items-center gap-4">
                    {viewState !== 'departments' && (
                        <button
                            onClick={handleBack}
                            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all active:scale-95"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}

                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                            Student Directory
                        </h2>
                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-2 text-sm font-medium mt-1">
                            <span className={`transition-colors ${viewState === 'departments' ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                                Departments
                            </span>
                            {selectedDept && (
                                <>
                                    <ChevronIcon size={14} className="text-gray-300 dark:text-gray-600" />
                                    <span className={`transition-colors ${viewState === 'years' ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                                        {selectedDept}
                                    </span>
                                </>
                            )}
                            {selectedYear && (
                                <>
                                    <ChevronIcon size={14} className="text-gray-300 dark:text-gray-600" />
                                    <span className="text-black dark:text-white">
                                        Year {selectedYear}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* AI / Standard Search Bar */}
                    <div className="relative w-full md:w-80 animate-fade-in group">
                        <div className={`absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity ${isAIActive ? 'opacity-100' : ''}`}></div>
                        <div className="relative flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-500/50">
                            {aiLoading ? (
                                <Loader2 size={18} className="absolute left-3 text-purple-500 animate-spin" />
                            ) : (
                                <Sparkles size={18} className={`absolute left-3 ${searchQuery.length > 5 ? 'text-purple-500' : 'text-gray-400'}`} />
                            )}
                            <input
                                type="text"
                                placeholder="Ask AI: 'Year 3 CSE students with > 8 CGPA'"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (e.target.value === '') {
                                        setIsAIActive(false);
                                        if (viewState === 'departments') setSelectedDept(null);
                                    }
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                                className="w-full pl-10 pr-12 py-2.5 bg-transparent text-sm font-medium text-gray-900 dark:text-white outline-none placeholder-gray-400"
                            />
                            <button
                                onClick={handleAISearch}
                                className="absolute right-1 p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-gray-500 hover:text-purple-600 rounded-lg transition-colors"
                                title="Ask AI"
                            >
                                <Brain size={16} />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-lg shadow-gray-200 dark:shadow-none"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Add Student</span>
                        <span className="sm:hidden">Add</span>
                    </button>
                </div>
            </div>

            {/* Modals */}
            {showAddForm && <StudentForm onClose={() => setShowAddForm(false)} onSuccess={handleFormSuccess} />}
            {editingStudent && <StudentForm student={editingStudent} onClose={() => setEditingStudent(null)} onSuccess={handleFormSuccess} />}

            {/* Content Area */}
            <div className="animate-fade-in">
                {/* DEPARTMENTS VIEW */}
                {viewState === 'departments' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                        {departments.map(dept => (
                            <button
                                key={dept}
                                onClick={() => handleDeptClick(dept)}
                                className="group relative bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none border border-gray-100 dark:border-gray-800 transition-all duration-300 hover:-translate-y-1 flex flex-col items-center justify-center gap-6"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 flex items-center justify-center transition-colors duration-300">
                                    {(() => {
                                        const Icon = {
                                            'CSE': Code,
                                            'IT': Globe,
                                            'ECE': Cpu,
                                            'EEE': Zap,
                                            'MECH': Wrench,
                                            'CIVIL': Hammer,
                                            'AI&DS': Brain
                                        }[dept] || Building2;
                                        return <Icon size={32} className="text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors" />;
                                    })()}
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{dept}</h3>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 font-medium">Department</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* YEARS VIEW */}
                {viewState === 'years' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {years.map(year => (
                            <button
                                key={year}
                                onClick={() => handleYearClick(year)}
                                className="group relative bg-white dark:bg-gray-900 h-64 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:shadow-gray-200/50 dark:hover:shadow-none border border-gray-100 dark:border-gray-800 transition-all duration-500 overflow-hidden text-left"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.1] group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-500 transform group-hover:scale-110 origin-top-right">
                                    <GraduationCap size={120} className="dark:text-white" />
                                </div>
                                <div className="relative z-10 h-full flex flex-col justify-between">
                                    <div>
                                        <span className="inline-block px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">
                                            ACADEMIC YEAR
                                        </span>
                                        <h3 className="text-5xl font-bold text-gray-900 dark:text-white tracking-tighter">
                                            0{year}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors font-medium">
                                        <span>View Students</span>
                                        <ChevronRight size={16} />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* STUDENTS TABLE VIEW */}
                {viewState === 'students' && (
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
                        {loading ? (
                            <div className="p-12 text-center text-gray-400">Loading students...</div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <p>{searchQuery ? 'No students match your search.' : 'No students found in this class.'}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            <th className="p-6 font-semibold">Name</th>
                                            <th className="p-6 font-semibold">Department</th>
                                            <th className="p-6 font-semibold">Year</th>
                                            <th className="p-6 font-semibold">Semester</th>
                                            <th className="p-6 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {filteredStudents.map(student => (
                                            <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                                                <td className="p-6">
                                                    <div>
                                                        <div className="font-semibold text-gray-900 dark:text-white">{student.name}</div>
                                                        <div className="text-sm text-gray-400">{student.regNo || student.email}</div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                                        {student.dept}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-sm text-gray-600 dark:text-gray-300 font-medium">Year {student.year}</td>
                                                <td className="p-6">
                                                    <span className="font-bold text-gray-900 dark:text-white">
                                                        Sem {student.semester || ((student.year * 2) - 1)}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => setEditingStudent(student)}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(student.id, student.regNo)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
