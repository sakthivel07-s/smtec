import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from "../../contexts/AuthContext";
import { ChevronRight, Users, User, ArrowLeft, GraduationCap, Building2, ChevronRight as ChevronIcon, Search, Code, Globe, Cpu, Zap, Wrench, Hammer, Brain, Sparkles, Loader2 } from 'lucide-react';
import SkillReport from './SkillReport';
import { parseLeaderboardQuery } from '../../utils/aiService';

export default function SkillReportViewer() {
    const { userDept } = useAuth();
    const [viewState, setViewState] = useState('departments'); // departments, years, students, report, ai_results
    const [selectedDept, setSelectedDept] = useState(null);
    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // AI Search State
    const [aiQuery, setAiQuery] = useState('');
    const [isAiSearching, setIsAiSearching] = useState(false);
    const [aiResults, setAiResults] = useState([]);
    const [aiFilterInfo, setAiFilterInfo] = useState(null);

    const departments = userDept ? [userDept] : ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];
    const years = [1, 2, 3, 4];

    const fetchStudents = async (dept, year) => {
        setLoading(true);
        try {
            const q = query(
                collection(db, "users"),
                where("role", "==", "student"),
                where("dept", "==", dept),
                where("year", "==", Number(year))
            );
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(list);
            setFilteredStudents(list);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAiSearch = async (e) => {
        if (e.key !== 'Enter' || !aiQuery.trim()) return;

        setIsAiSearching(true);
        try {
            // 1. Parse Query
            const filters = await parseLeaderboardQuery(aiQuery);
            setAiFilterInfo(filters);

            // 2. Fetch ALL Data (Aggregation) - Similar to Leaderboard
            const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
            const studentsSnapshot = await getDocs(studentsQuery);
            const studentMap = {};

            studentsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.regNo) {
                    studentMap[data.regNo] = {
                        id: doc.id,
                        ...data,
                        points: 0 // Init points
                    };
                }
            });

            const skillsSnapshot = await getDocs(collection(db, "student_skills"));
            skillsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (studentMap[data.regNo]) {
                    studentMap[data.regNo].points += Number(data.points) || 0;
                }
            });

            let allStudents = Object.values(studentMap);

            // 3. Apply AI Filters
            let results = allStudents;

            if (userDept) {
                results = results.filter(s => (s.dept || s.department) === userDept);
            }
            if (filters.dept) {
                results = results.filter(s => (s.dept || s.department) === filters.dept);
            }
            if (filters.year) {
                results = results.filter(s => Number(s.year) === Number(filters.year));
            }
            if (filters.minPoints !== null) {
                results = results.filter(s => s.points >= filters.minPoints);
            }
            if (filters.maxPoints !== null) {
                results = results.filter(s => s.points <= filters.maxPoints);
            }

            // Sort
            results.sort((a, b) => {
                return filters.sortOrder === 'asc' ? a.points - b.points : b.points - a.points;
            });

            // Limit
            if (filters.limit) {
                results = results.slice(0, filters.limit);
            }

            setAiResults(results);
            setViewState('ai_results');

        } catch (error) {
            console.error("AI Search Failed:", error);
        } finally {
            setIsAiSearching(false);
        }
    };

    // Handle Search Filter (Manual)
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredStudents(students);
            return;
        }

        const queryLower = searchQuery.toLowerCase();
        const filtered = students.filter(student =>
            student.name?.toLowerCase().includes(queryLower) ||
            student.regNo?.toLowerCase().includes(queryLower)
        );
        setFilteredStudents(filtered);
    }, [searchQuery, students]);

    const handleDeptClick = (dept) => { setSelectedDept(dept); setViewState('years'); };
    const handleYearClick = (year) => { setSelectedYear(year); setViewState('students'); fetchStudents(selectedDept, year); };
    const handleStudentClick = (student) => { setSelectedStudent(student); setViewState('report'); };

    const handleBack = () => {
        if (viewState === 'report') {
            // Check if we came from AI Results or Standard Flow
            if (aiResults.length > 0 && aiResults.find(s => s.regNo === selectedStudent.regNo)) {
                setViewState('ai_results');
            } else {
                setViewState('students');
            }
        }
        else if (viewState === 'ai_results') {
            setViewState('departments');
            setAiQuery('');
            setAiResults([]);
        }
        else if (viewState === 'students') {
            setViewState('years');
            setSearchQuery(''); // Clear search when going back
        }
        else if (viewState === 'years') setViewState('departments');
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden min-h-[700px] flex flex-col font-sans transition-all duration-500">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-20 flex flex-col xl:flex-row items-center justify-between gap-4 transition-colors">
                <div className="flex items-center gap-4 w-full xl:w-auto overflow-hidden">
                    {viewState !== 'departments' && (
                        <button
                            onClick={handleBack}
                            className="p-2 -ml-2 rounded-full hover:bg-gray-100/80 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all active:scale-95 flex-shrink-0"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}

                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-sm font-medium overflow-x-auto no-scrollbar mask-linear-fade">
                        {viewState === 'ai_results' ? (
                            <span className="px-3 py-1 rounded-full bg-indigo-600 text-white flex items-center gap-2 whitespace-nowrap">
                                <Sparkles size={14} /> AI Search Results
                            </span>
                        ) : (
                            <>
                                <span className={`px-3 py-1 rounded-full transition-colors whitespace-nowrap ${viewState === 'departments' ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-gray-400 dark:text-gray-500'}`}>
                                    Departments
                                </span>
                                {selectedDept && (
                                    <>
                                        <ChevronIcon size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                        <span className={`px-3 py-1 rounded-full transition-colors whitespace-nowrap ${viewState === 'years' ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {selectedDept}
                                        </span>
                                    </>
                                )}
                                {selectedYear && (
                                    <>
                                        <ChevronIcon size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                        <span className={`px-3 py-1 rounded-full transition-colors whitespace-nowrap ${viewState === 'students' ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-gray-500 dark:text-gray-400'}`}>
                                            Year {selectedYear}
                                        </span>
                                    </>
                                )}
                            </>
                        )}
                        {selectedStudent && (
                            <>
                                <ChevronIcon size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                <span className="px-3 py-1 rounded-full bg-black dark:bg-white text-white dark:text-black whitespace-nowrap">
                                    {selectedStudent.name}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Search Area */}
                <div className="flex items-center gap-3 w-full xl:w-auto">
                    {/* General Search (Local) */}
                    {viewState === 'students' && (
                        <div className="relative flex-1 xl:w-64 animate-fade-in">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search student..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white placeholder-gray-400 transition-all"
                            />
                        </div>
                    )}

                    {/* AI Search (Global) */}
                    <div className="relative flex-1 xl:w-80">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500">
                            {isAiSearching ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        </div>
                        <input
                            type="text"
                            placeholder="Ask AI (e.g. 'Top 5 CSE students')"
                            value={aiQuery}
                            onChange={(e) => setAiQuery(e.target.value)}
                            onKeyDown={handleAiSearch}
                            disabled={isAiSearching}
                            className={`w-full pl-9 pr-4 py-2 border border-indigo-100 dark:border-indigo-900/30 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white placeholder-indigo-300 dark:placeholder-indigo-600 transition-all ${isAiSearching ? 'bg-indigo-50' : 'bg-white dark:bg-gray-800'}`}
                        />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-8 flex-1 bg-gray-50/50 dark:bg-gray-900/50 transition-colors overflow-y-auto">
                <div className="animate-fade-in h-full max-w-7xl mx-auto">

                    {/* DEPARTMENTS */}
                    {viewState === 'departments' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                            {departments.map(dept => (
                                <button
                                    key={dept}
                                    onClick={() => handleDeptClick(dept)}
                                    className="group relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:-translate-y-1 flex flex-col items-center justify-center gap-6"
                                >
                                    <div className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-gray-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 flex items-center justify-center transition-colors duration-300">
                                        {(() => {
                                            const Icon = {
                                                'CSE': Code, 'IT': Globe, 'ECE': Cpu, 'EEE': Zap, 'MECH': Wrench, 'CIVIL': Hammer, 'AI&DS': Brain
                                            }[dept] || Building2;
                                            return <Icon size={32} className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />;
                                        })()}
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">{dept}</h3>
                                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 font-medium">Department</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* YEARS */}
                    {viewState === 'years' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {years.map(year => (
                                <button
                                    key={year}
                                    onClick={() => handleYearClick(year)}
                                    className="group relative bg-white dark:bg-gray-800 h-64 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:shadow-gray-200/50 dark:hover:shadow-none border border-gray-100 dark:border-gray-700 transition-all duration-500 overflow-hidden text-left"
                                >
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.1] group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-500 transform group-hover:scale-110 origin-top-right">
                                        <GraduationCap size={120} className="dark:text-white" />
                                    </div>
                                    <div className="relative z-10 h-full flex flex-col justify-between">
                                        <div>
                                            <span className="inline-block px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">
                                                ACADEMIC YEAR
                                            </span>
                                            <h3 className="text-5xl font-bold text-gray-900 dark:text-white tracking-tighter">0{year}</h3>
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

                    {/* STUDENTS LIST */}
                    {viewState === 'students' && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-700/30 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {selectedDept} Students <span className="text-gray-400 dark:text-gray-500 font-normal ml-2">Year {selectedYear}</span>
                                </h3>
                                <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                                    {filteredStudents.length} Students
                                </span>
                            </div>

                            {loading ? (
                                <div className="p-12 text-center text-gray-400">Loading...</div>
                            ) : filteredStudents.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    {searchQuery ? 'No students match your search.' : 'No students found in this class.'}
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[500px] overflow-y-auto custom-scrollbar">
                                    {filteredStudents.map(student => (
                                        <button
                                            key={student.id}
                                            onClick={() => handleStudentClick(student)}
                                            className="w-full px-8 py-5 flex items-center gap-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group text-left"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-200 font-semibold text-lg shadow-inner">
                                                {student.name.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {student.name}
                                                </h4>
                                                <p className="text-sm text-gray-400 dark:text-gray-500 font-mono mt-0.5">{student.regNo}</p>
                                            </div>
                                            <ChevronRight size={20} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* AI RESULTS */}
                    {viewState === 'ai_results' && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 bg-indigo-50/30 dark:bg-indigo-900/10 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                                    <Sparkles size={18} className="text-indigo-500" />
                                    AI Search Results
                                </h3>
                                <span className="text-sm text-indigo-400 dark:text-indigo-400 font-medium">
                                    Found {aiResults.length} matches
                                </span>
                            </div>

                            {aiResults.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    No students found matching your criteria.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[500px] overflow-y-auto custom-scrollbar">
                                    {aiResults.map(student => (
                                        <button
                                            key={student.id}
                                            onClick={() => handleStudentClick(student)}
                                            className="w-full px-8 py-5 flex items-center gap-6 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors group text-left"
                                        >
                                            <div className="relative">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-200 font-semibold text-lg shadow-inner">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-gray-800">
                                                    {student.points} pts
                                                </div>
                                            </div>

                                            <div className="flex-1">
                                                <h4 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {student.name}
                                                </h4>
                                                <div className="flex gap-2 text-sm mt-0.5">
                                                    <span className="text-gray-400 dark:text-gray-500 font-mono">{student.regNo}</span>
                                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                                    <span className="text-gray-500 dark:text-gray-400">{student.dept} - Year {student.year}</span>
                                                </div>
                                            </div>
                                            <ChevronRight size={20} className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* REPORT VIEW */}
                    {viewState === 'report' && selectedStudent && (
                        <SkillReport regNo={selectedStudent.regNo} />
                    )}
                </div>
            </div>
        </div>
    );
}
