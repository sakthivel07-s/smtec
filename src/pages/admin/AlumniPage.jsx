import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from "../../contexts/AuthContext";
import { ChevronRight, GraduationCap, User, ArrowLeft, Search, Building2, Code, Globe, Cpu, Zap, Wrench, Hammer, Brain } from 'lucide-react';
import SkillReport from '../../components/skills/SkillReport';

export default function AlumniPage() {
    const { userDept } = useAuth();
    const [viewState, setViewState] = useState('batches'); // batches -> depts -> students
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [selectedDept, setSelectedDept] = useState(null);
    const [selectedAlumni, setSelectedAlumni] = useState(null); // New state for selected alumni

    const [batches, setBatches] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const departments = userDept ? [userDept] : ["CSE", "ECE", "MECH", "CIVIL", "EEE", "IT", "AI&DS"];

    // Fetch unique batches on load
    useEffect(() => {
        const fetchBatches = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, "users"), where("role", "==", "alumni"));
                const snapshot = await getDocs(q);
                const batchSet = new Set();
                snapshot.forEach(doc => {
                    if (doc.data().batch) batchSet.add(doc.data().batch);
                });
                setBatches(Array.from(batchSet).sort().reverse());
            } catch (error) {
                console.error("Error fetching batches:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBatches();
    }, []);

    // Fetch students for selected batch and dept
    const fetchStudents = async (batch, dept) => {
        setLoading(true);
        try {
            const q = query(
                collection(db, "users"),
                where("role", "==", "alumni"),
                where("batch", "==", batch),
                where("dept", "==", dept)
            );
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(list);
        } catch (error) {
            console.error("Error fetching alumni:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleBatchClick = (batch) => {
        setSelectedBatch(batch);
        setViewState('depts');
    };

    const handleDeptClick = (dept) => {
        setSelectedDept(dept);
        setViewState('students');
        fetchStudents(selectedBatch, dept);
    };

    const handleAlumniClick = (student) => {
        setSelectedAlumni(student);
    };

    const handleBack = () => {
        if (selectedAlumni) {
            setSelectedAlumni(null);
        } else if (viewState === 'students') {
            setViewState('depts');
            setStudents([]); // Clear students when going back
        } else if (viewState === 'depts') {
            setViewState('batches');
            setSelectedBatch(null);
        }
    };

    const filteredStudents = students.filter(s =>
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.regNo?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 font-sans min-h-[600px]">
            {/* Header */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
                <div className="flex items-center gap-4">
                    {(viewState !== 'batches' || selectedAlumni) && (
                        <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                            Alumni Directory
                        </h2>
                        <div className="flex items-center gap-2 text-sm font-medium mt-1 text-gray-500 dark:text-gray-400">
                            <span className={viewState === 'batches' && !selectedAlumni ? 'text-black dark:text-white' : ''}>Batches</span>
                            {selectedBatch && (
                                <>
                                    <ChevronRight size={14} />
                                    <span className={viewState === 'depts' && !selectedAlumni ? 'text-black dark:text-white' : ''}>{selectedBatch}</span>
                                </>
                            )}
                            {selectedDept && (
                                <>
                                    <ChevronRight size={14} />
                                    <span className={viewState === 'students' && !selectedAlumni ? 'text-black dark:text-white' : ''}>{selectedDept}</span>
                                </>
                            )}
                            {selectedAlumni && (
                                <>
                                    <ChevronRight size={14} />
                                    <span className="text-black dark:text-white">{selectedAlumni.name}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="animate-fade-in">
                {loading && <div className="p-12 text-center text-gray-400">Loading...</div>}

                {/* ALUMNI SKILL REPORT VIEW */}
                {!loading && selectedAlumni && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-6 transition-colors">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg">
                                {selectedAlumni.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedAlumni.name}</h3>
                                <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                                    <span>{selectedAlumni.regNo}</span>
                                    <span>•</span>
                                    <span>{selectedAlumni.dept}</span>
                                    <span>•</span>
                                    <span>Batch {selectedAlumni.batch}</span>
                                </div>
                            </div>
                            <div className="ml-auto flex flex-col items-end">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">CGPA</span>
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">{selectedAlumni.cgpa || '-'}</span>
                            </div>
                        </div>

                        <SkillReport regNo={selectedAlumni.regNo} />
                    </div>
                )}

                {/* BATCHES VIEW */}
                {!loading && !selectedAlumni && viewState === 'batches' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {batches.length === 0 ? (
                            <div className="col-span-full text-center text-gray-400 py-12">No alumni batches found.</div>
                        ) : (
                            batches.map(batch => (
                                <button
                                    key={batch}
                                    onClick={() => handleBatchClick(batch)}
                                    className="group relative bg-white dark:bg-gray-900 h-48 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none border border-gray-100 dark:border-gray-800 transition-all duration-300 text-left overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-6 opacity-[0.05] dark:opacity-[0.1] group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity transform group-hover:scale-110">
                                        <GraduationCap size={100} className="dark:text-white" />
                                    </div>
                                    <div className="relative z-10 h-full flex flex-col justify-between">
                                        <div>
                                            <span className="inline-block px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold mb-4">
                                                BATCH
                                            </span>
                                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{batch}</h3>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium">
                                            <span>View Departments</span>
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}

                {/* DEPARTMENTS VIEW */}
                {!loading && !selectedAlumni && viewState === 'depts' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                        {departments.map(dept => (
                            <button
                                key={dept}
                                onClick={() => handleDeptClick(dept)}
                                className="group bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none border border-gray-100 dark:border-gray-800 transition-all duration-300 hover:-translate-y-1 flex flex-col items-center justify-center gap-6"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black flex items-center justify-center transition-colors duration-300 text-gray-400">
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
                                        return <Icon size={28} />;
                                    })()}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{dept}</h3>
                            </button>
                        ))}
                    </div>
                )}

                {/* STUDENTS VIEW */}
                {!loading && !selectedAlumni && viewState === 'students' && (
                    <div className="space-y-4">
                        <div className="relative max-w-md">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search alumni..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder-gray-400"
                            />
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
                            {filteredStudents.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">No alumni found in this department.</div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredStudents.map(student => (
                                        <div
                                            key={student.id}
                                            onClick={() => handleAlumniClick(student)}
                                            className="p-6 flex items-center gap-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-900 to-gray-700 text-white flex items-center justify-center font-bold text-lg shadow-md">
                                                {student.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="text-base font-bold text-gray-900 dark:text-white">{student.name}</h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{student.regNo}</p>
                                            </div>
                                            <div className="ml-auto flex flex-col items-end">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">CGPA</span>
                                                <span className="font-bold text-gray-900 dark:text-white">{student.cgpa || '-'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
