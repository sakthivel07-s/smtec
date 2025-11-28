import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from "../../contexts/AuthContext";
import { Users, ArrowRight, GraduationCap, AlertTriangle, Loader2 } from 'lucide-react';

export default function BatchManagement() {
    const { userDept } = useAuth();
    const [stats, setStats] = useState({ 1: 0, 2: 0, 3: 0, 4: 0 });
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [batchName, setBatchName] = useState(`2021-${new Date().getFullYear()}`);

    useEffect(() => {
        fetchStats();
    }, [userDept]);

    async function fetchStats() {
        setLoading(true);
        try {
            const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
            let q = query(collection(db, "users"), where("role", "==", "student"));

            if (userDept) {
                q = query(q, where("dept", "==", userDept));
            }

            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                const year = doc.data().year;
                if (counts[year] !== undefined) counts[year]++;
            });
            setStats(counts);
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    }

    const handlePromote = async (year) => {
        // Validation: Cannot promote if next year is occupied
        if (stats[year + 1] > 0) {
            alert(`Cannot promote Year ${year} students because Year ${year + 1} is not empty. Please promote or graduate Year ${year + 1} students first.`);
            return;
        }

        if (!confirm(`Are you sure you want to promote Year ${year} students to Year ${year + 1}? This action cannot be easily undone.`)) return;

        setProcessing(true);
        try {
            const batch = writeBatch(db);
            let q = query(collection(db, "users"), where("role", "==", "student"), where("year", "==", year));

            if (userDept) {
                q = query(q, where("dept", "==", userDept));
            }

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                alert("No students found in this year.");
                setProcessing(false);
                return;
            }

            snapshot.docs.forEach(d => {
                const ref = doc(db, "users", d.id);
                const currentSem = d.data().semester || (year * 2 - 1);
                batch.update(ref, {
                    year: year + 1,
                    semester: currentSem + 2
                });
            });

            await batch.commit();
            alert("Promotion successful!");
            fetchStats();
        } catch (error) {
            console.error("Error promoting students:", error);
            alert("Error promoting students.");
        } finally {
            setProcessing(false);
        }
    };

    const handleGraduate = async () => {
        if (!batchName) return alert("Please enter a batch name (e.g., 2021-2025)");
        if (!confirm(`Are you sure you want to graduate Year 4 students as Batch '${batchName}'? They will be moved to the Alumni list.`)) return;

        setProcessing(true);
        try {
            const batch = writeBatch(db);
            let q = query(collection(db, "users"), where("role", "==", "student"), where("year", "==", 4));

            if (userDept) {
                q = query(q, where("dept", "==", userDept));
            }

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                alert("No Year 4 students found.");
                setProcessing(false);
                return;
            }

            snapshot.docs.forEach(d => {
                const ref = doc(db, "users", d.id);
                batch.update(ref, {
                    role: 'alumni',
                    batch: batchName,
                    graduatedAt: new Date().toISOString()
                });
            });

            await batch.commit();
            alert("Graduation successful! Students moved to Alumni.");
            fetchStats();
        } catch (error) {
            console.error("Error graduating students:", error);
            alert("Error graduating students.");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-8 font-sans max-w-5xl mx-auto">
            <div className="bg-gradient-to-r from-gray-900 to-black rounded-3xl p-8 text-white shadow-xl">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 text-white">
                    <Users className="text-blue-400" />
                    Batch Management
                </h1>
                <p className="text-gray-400 text-lg">Promote students to the next academic year or graduate them to alumni.</p>
            </div>

            {loading ? (
                <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-gray-500 dark:text-gray-400" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Promotion Cards */}
                    {[1, 2, 3].map(year => {
                        const isNextYearOccupied = stats[year + 1] > 0;
                        const isDisabled = processing || stats[year] === 0 || isNextYearOccupied;

                        return (
                            <div key={year} className={`bg-white dark:bg-gray-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group transition-colors ${isNextYearOccupied ? 'opacity-75' : ''}`}>
                                <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
                                    <ArrowRight size={100} className="dark:text-white" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Promote Year {year}</h3>
                                        {isNextYearOccupied && (
                                            <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                                <AlertTriangle size={12} /> Year {year + 1} Occupied
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-end gap-2 mb-6">
                                        <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">{stats[year]}</span>
                                        <span className="text-gray-500 dark:text-gray-400 font-medium mb-1">Students</span>
                                    </div>

                                    <button
                                        onClick={() => handlePromote(year)}
                                        disabled={isDisabled}
                                        className={`w-full py-3 font-bold rounded-xl border transition-all flex items-center justify-center gap-2 
                                            ${isDisabled
                                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                                                : 'bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700'
                                            }`}
                                    >
                                        {processing ? <Loader2 className="animate-spin" size={18} /> : (
                                            <>
                                                Move to Year {year + 1} <ArrowRight size={18} />
                                            </>
                                        )}
                                    </button>

                                    {isNextYearOccupied && (
                                        <p className="text-xs text-red-500 dark:text-red-400 mt-3 font-medium">
                                            * You must clear Year {year + 1} first.
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Graduation Card */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 md:p-8 rounded-3xl text-white shadow-lg shadow-blue-200 dark:shadow-none relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <GraduationCap size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-2 text-white">Graduate Final Year</h3>
                            <div className="flex items-end gap-2 mb-6">
                                <span className="text-4xl font-bold text-white">{stats[4]}</span>
                                <span className="text-blue-100 font-medium mb-1">Students (Year 4)</span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-blue-200 uppercase tracking-wider">Batch Name</label>
                                    <input
                                        type="text"
                                        value={batchName}
                                        onChange={(e) => setBatchName(e.target.value)}
                                        className="w-full mt-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                                        placeholder="e.g. 2021-2025"
                                    />
                                </div>
                                <button
                                    onClick={handleGraduate}
                                    disabled={processing || stats[4] === 0}
                                    className="w-full py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>
                                            <GraduationCap size={20} /> Graduate Batch
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/50 rounded-2xl p-6 flex gap-4 items-start transition-colors">
                <AlertTriangle className="text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
                <div>
                    <h4 className="font-bold text-yellow-800 dark:text-yellow-400">Sequential Promotion Required</h4>
                    <p className="text-yellow-700 dark:text-yellow-300/80 text-sm mt-1">
                        To prevent merging batches, you must promote students in reverse order:
                        <br />
                        1. <strong>Graduate Year 4</strong> (Moves them to Alumni)
                        <br />
                        2. <strong>Promote Year 3</strong> to Year 4
                        <br />
                        3. <strong>Promote Year 2</strong> to Year 3
                        <br />
                        4. <strong>Promote Year 1</strong> to Year 2
                    </p>
                </div>
            </div>
        </div>
    );
}
