import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from "../../contexts/AuthContext";
import StudentForm from './StudentForm';
import { Plus, Search, Filter, Trash2, Edit2, GraduationCap, ChevronRight, ArrowLeft, ChevronRight as ChevronIcon, Building2, Code, Globe, Cpu, Zap, Wrench, Hammer, Brain, X, Link as LinkIcon, ExternalLink, BadgeCheck, Book, Target, Sparkles, Loader2, MessageSquare, FolderOpen, Trophy, Github, CheckCircle, Linkedin, Link, RefreshCw } from 'lucide-react';
import { parseNaturalLanguageQuery, isAIConfigured } from '../../utils/aiService';
import { getDoc } from 'firebase/firestore';

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
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [viewingStudent, setViewingStudent] = useState(null);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);

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

    const handleViewDetail = async (student) => {
        setIsFetchingDetail(true);
        try {
            const profileRef = doc(db, "student_profiles", student.id);
            const profileSnap = await getDoc(profileRef);
            if (profileSnap.exists()) {
                setViewingStudent({ ...student, ...profileSnap.data() });
            } else {
                setViewingStudent(student); // Fallback to basic user data
            }
            setShowDetailModal(true);
        } catch (error) {
            console.error("Error fetching detail:", error);
            setViewingStudent(student);
            setShowDetailModal(true);
        } finally {
            setIsFetchingDetail(false);
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
                                            <tr 
                                                key={student.id} 
                                                onClick={() => handleViewDetail(student)}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group cursor-pointer"
                                            >
                                                <td className="p-6">
                                                    <div>
                                                        <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{student.name}</div>
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
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingStudent(student);
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(student.id, student.regNo);
                                                            }}
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

            {/* --- LOADING DETAIL OVERLAY --- */}
            {isFetchingDetail && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-blue-600" size={40} />
                        <p className="text-sm font-bold text-gray-500">Fetching Student Profile...</p>
                    </div>
                </div>
            )}

            {/* --- STUDENT DETAIL MODAL --- */}
            {showDetailModal && viewingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 animate-fade-in">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setShowDetailModal(false)}></div>
                    
                    <div className="relative bg-white dark:bg-gray-900 w-full max-w-5xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 dark:border-gray-800 flex flex-col md:flex-row animate-zoom-in">
                        {/* Sidebar Detail (LHS) */}
                        <div className="w-full md:w-80 bg-gray-50 dark:bg-gray-800/50 p-8 border-r border-gray-100 dark:border-gray-800 flex flex-col items-center text-center overflow-y-auto">
                            <div className="relative mb-6">
                                <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-5xl font-black shadow-2xl">
                                    {viewingStudent.name[0]}
                                </div>
                                {(viewingStudent.professionalAnalysis || viewingStudent.githubAnalysis) && (
                                    <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-900 p-2 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800">
                                        <Trophy size={20} className="text-yellow-500" />
                                    </div>
                                )}
                            </div>
                            
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight mb-1">{viewingStudent.name}</h2>
                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-6">{viewingStudent.dept} | Year {viewingStudent.year}</p>
                            
                            <div className="w-full space-y-3 mb-8">
                                <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 text-left">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Registration No</p>
                                    <p className="text-sm font-black text-gray-900 dark:text-white">{viewingStudent.regNo}</p>
                                </div>
                            </div>

                            <div className="w-full space-y-3 mb-8">
                                <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 text-left">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                        {viewingStudent.professionalAnalysis ? 'Integrated PQ Index' : 'AI Developer Score'}
                                    </p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                                            {viewingStudent.professionalAnalysis?.pqScore ?? viewingStudent.githubAnalysis?.score}
                                        </span>
                                        <span className="text-sm font-bold text-gray-400 mb-2">/ 100</span>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 text-left">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Archetype</p>
                                    <p className="text-sm font-black text-gray-900 dark:text-white truncate">
                                        {viewingStudent.professionalAnalysis?.verdict ?? viewingStudent.githubAnalysis?.title ?? 'Building Skills'}
                                    </p>
                                </div>
                            </div>

                            <div className="w-full space-y-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left px-2">Links & Socials</p>
                                {viewingStudent.github && (
                                    <a href={viewingStudent.github.startsWith('http') ? viewingStudent.github : `https://${viewingStudent.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white dark:hover:bg-gray-900 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300">
                                        <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center">
                                            <Github size={16} />
                                        </div>
                                        GitHub Profile <ExternalLink size={14} className="ml-auto opacity-40" />
                                    </a>
                                )}
                                {viewingStudent.portfolio && (
                                    <a href={viewingStudent.portfolio.startsWith('http') ? viewingStudent.portfolio : `https://${viewingStudent.portfolio}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white dark:hover:bg-gray-900 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                            <LinkIcon size={16} />
                                        </div>
                                        Live Preview <ExternalLink size={14} className="ml-auto opacity-40" />
                                    </a>
                                )}
                                {viewingStudent.linkedin && (
                                    <a href={viewingStudent.linkedin.startsWith('http') ? viewingStudent.linkedin : `https://${viewingStudent.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white dark:hover:bg-gray-900 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300">
                                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                                            <BadgeCheck size={16} />
                                        </div>
                                        LinkedIn <ExternalLink size={14} className="ml-auto opacity-40" />
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Content Area (RHS) */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white dark:bg-gray-900">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-2">Integrated Professional Profile</p>
                                    <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                                        {viewingStudent.professionalAnalysis?.verdict ?? viewingStudent.githubAnalysis?.title ?? 'Aspiring Professional'}
                                    </h3>
                                </div>
                                <button 
                                    onClick={() => setShowDetailModal(false)}
                                    className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-2xl transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-10">
                                <section>
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Sparkles size={18} className="text-yellow-500" /> Professional Analysis Summary
                                    </h4>
                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg bg-gray-50 dark:bg-gray-800/30 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                                        {viewingStudent.professionalAnalysis?.overallSummary || viewingStudent.githubAnalysis?.summary || viewingStudent.about || viewingStudent.bio || "No summary provided."}
                                    </p>
                                </section>

                                {viewingStudent.professionalAnalysis && (
                                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Github size={14} className="text-indigo-600" />
                                                <span className="text-[10px] font-black uppercase text-gray-400">Technical</span>
                                            </div>
                                            <p className="text-2xl font-black">{viewingStudent.professionalAnalysis.githubAnalysis?.score || 0}</p>
                                        </div>
                                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Linkedin size={14} className="text-blue-600" />
                                                <span className="text-[10px] font-black uppercase text-gray-400">LinkedIn</span>
                                            </div>
                                            <p className="text-2xl font-black">{viewingStudent.professionalAnalysis.linkedinAnalysis?.score || 0}</p>
                                        </div>
                                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Globe size={14} className="text-purple-600" />
                                                <span className="text-[10px] font-black uppercase text-gray-400">Portfolio</span>
                                            </div>
                                            <p className="text-2xl font-black">{viewingStudent.professionalAnalysis.portfolioAnalysis?.score || 0}</p>
                                        </div>
                                    </section>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <section>
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <CheckCircle size={18} className="text-green-500" /> Key Strengths
                                        </h4>
                                        <ul className="space-y-3">
                                            {(viewingStudent.professionalAnalysis?.githubAnalysis?.strengths || viewingStudent.githubAnalysis?.strengths)?.map((s, i) => (
                                                <li key={i} className="flex items-start gap-3 text-gray-600 dark:text-gray-400 font-medium text-sm">
                                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                    <section>
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Book size={18} className="text-blue-500" /> Verified Tech Stack
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {(viewingStudent.professionalAnalysis?.githubAnalysis?.techStack || viewingStudent.githubAnalysis?.techStack)?.map((tech, i) => (
                                                <span key={i} className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-100 dark:border-blue-800">
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                                
                                {viewingStudent.professionalAnalysis?.linkedinAnalysis && (
                                    <section>
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Linkedin size={18} className="text-blue-600" /> LinkedIn Activity & Reach
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="p-6 bg-blue-50/30 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-800/30">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-black uppercase text-blue-500">Brand Strength</span>
                                                    <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                                                        {viewingStudent.professionalAnalysis.linkedinAnalysis?.brandStrength || "Building"}
                                                    </span>
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300 text-sm italic leading-relaxed">
                                                    "{viewingStudent.professionalAnalysis.linkedinAnalysis?.activityVerdict || "Consistent growth in professional networking detected."}"
                                                </p>
                                            </div>
                                            
                                            {viewingStudent.professionalAnalysis.linkedinAnalysis?.postReachAnalysis && (
                                                <div className="p-4 bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <Sparkles size={12} /> Content Strategy Analysis
                                                    </h5>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                                                        {viewingStudent.professionalAnalysis.linkedinAnalysis.postReachAnalysis}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                )}

                                {viewingStudent.professionalAnalysis?.githubAnalysis?.deepAudit && (
                                    <section>
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Code size={18} className="text-indigo-500" /> Deep Technical Audit
                                        </h4>
                                        <div className="p-6 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-800/30">
                                            {viewingStudent.professionalAnalysis?.githubAnalysis?.technicalAudit && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                                    {[
                                                        { label: 'Code Format', value: viewingStudent.professionalAnalysis.githubAnalysis.technicalAudit.codeFormat, icon: <Code size={12} /> },
                                                        { label: 'Structure', value: viewingStudent.professionalAnalysis.githubAnalysis.technicalAudit.structure, icon: <LinkIcon size={12} /> },
                                                        { label: 'AI Detection', value: viewingStudent.professionalAnalysis.githubAnalysis.technicalAudit.aiDetection, icon: <Sparkles size={12} /> },
                                                        { label: 'Clean Code', value: viewingStudent.professionalAnalysis.githubAnalysis.technicalAudit.cleanCode, icon: <CheckCircle size={12} /> },
                                                        { label: 'Reusability', value: viewingStudent.professionalAnalysis.githubAnalysis.technicalAudit.reusability, icon: <RefreshCw size={12} /> }
                                                    ].map((item, i) => (
                                                        <div key={i} className="flex items-start gap-2 p-3 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/20">
                                                            <div className="mt-1 text-indigo-500">{item.icon}</div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">{item.label}</p>
                                                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{item.value}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[10px] font-black uppercase text-indigo-500">Architecture Report</span>
                                            </div>
                                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-white/40 dark:bg-black/20 p-4 rounded-2xl border border-indigo-50/50 dark:border-indigo-900/10">
                                                {viewingStudent.professionalAnalysis.githubAnalysis.deepAudit}
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {viewingStudent.professionalAnalysis?.portfolioAnalysis?.uiAudit && (
                                    <section>
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Globe size={18} className="text-purple-500" /> Portfolio UI/UX Review
                                        </h4>
                                        <div className="p-6 bg-purple-50/30 dark:bg-purple-900/10 rounded-3xl border border-purple-100 dark:border-purple-800/30">
                                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed italic">
                                                {viewingStudent.professionalAnalysis.portfolioAnalysis.uiAudit}
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {viewingStudent.githubAnalysis?.featuredProjects && (
                                    <section>
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <FolderOpen size={18} className="text-indigo-500" /> Featured GitHub Projects
                                        </h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            {viewingStudent.githubAnalysis.featuredProjects.map((proj, i) => (
                                                <div key={i} className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h5 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">{proj.name}</h5>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{proj.description}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {proj.highlights?.map((h, j) => (
                                                            <span key={j} className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                                                {h}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {viewingStudent.projects && (
                                    <section>
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Code size={18} className="text-purple-500" /> Featured Projects
                                        </h4>
                                        <div className="bg-gray-50 dark:bg-gray-800/30 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 whitespace-pre-wrap text-gray-600 dark:text-gray-400 leading-relaxed italic">
                                            {viewingStudent.projects}
                                        </div>
                                    </section>
                                )}

                                {viewingStudent.experience && (
                                    <section>
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Building2 size={18} className="text-orange-500" /> Experience
                                        </h4>
                                        <div className="bg-gray-50 dark:bg-gray-800/30 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 whitespace-pre-wrap text-gray-600 dark:text-gray-400 leading-relaxed">
                                            {viewingStudent.experience}
                                        </div>
                                    </section>
                                )}

                                {/* NEW: Activity Scores (PS Portal & Other Skills) */}
                                {(viewingStudent.psPortalData || viewingStudent.otherSkillsData) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                                        {viewingStudent.psPortalData && (
                                            <section>
                                                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <Target size={18} className="text-red-500" /> PS Portal Scores
                                                </h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {viewingStudent.psPortalData.map((lvl, idx) => (
                                                        <div key={idx} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                                            <span className="text-xs font-bold text-gray-500">{lvl.label}</span>
                                                            <span className="text-sm font-black text-red-600 dark:text-red-400">{lvl.points}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {viewingStudent.otherSkillsData && (
                                            <section>
                                                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <Sparkles size={18} className="text-emerald-500" /> External Skill Points
                                                </h4>
                                                <div className="space-y-2">
                                                    {viewingStudent.otherSkillsData.map((skill, idx) => (
                                                        <div key={idx} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                                            <span className="text-xs font-bold text-gray-500 capitalize">{skill.name}</span>
                                                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{skill.points} pts</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

