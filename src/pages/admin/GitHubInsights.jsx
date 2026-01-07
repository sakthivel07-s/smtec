import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Github, Trophy, ExternalLink, Search, Zap, Loader2, Code, Star, Calendar, RefreshCw, X, Link as LinkIcon, BadgeCheck, Book, Target, Sparkles, FolderOpen } from 'lucide-react';

export default function GitHubInsights() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchRankings();
    }, []);

    const fetchRankings = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "student_profiles"));
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).filter(s => s.githubAnalysis); // Only show students who have analyzed their GitHub

            // Sort by score descending
            data.sort((a, b) => (b.githubAnalysis?.score || 0) - (a.githubAnalysis?.score || 0));
            setStudents(data);
        } catch (error) {
            console.error("Error fetching github rankings:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s => 
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.regNo?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

    return (
        <div className="space-y-8 animate-fade-in font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                        <Github className="text-gray-900 dark:text-white" size={32} />
                        GitHub AI Insights
                    </h1>
                    <p className="text-gray-500 mt-1">Global rankings based on repository analysis and developer scores.</p>
                </div>
                
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search student or Reg No..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- RANKING TABLE --- */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                        <h2 className="font-bold flex items-center gap-2">
                            <Trophy size={20} className="text-yellow-500" /> Top Contributors
                        </h2>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-medium text-gray-400">{filteredStudents.length} Students Ranked</span>
                            <button 
                                onClick={fetchRankings}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
                                title="Refresh Rankings"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left bg-gray-50 dark:bg-gray-800/50">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Rank</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Tech Stack</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-20 text-center">
                                            <Github size={48} className="mx-auto mb-4 text-gray-200 dark:text-gray-800" />
                                            <p className="text-gray-500 font-medium">No students ranked yet.</p>
                                            <p className="text-xs text-gray-400 mt-1">Students must use "Sync & Analyze" in their profiles to appear here.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((s, idx) => (
                                        <tr 
                                            key={s.id} 
                                            onClick={() => {
                                                setSelectedStudent(s);
                                                setIsModalOpen(true);
                                            }}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                                    idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    idx === 1 ? 'bg-gray-100 text-gray-600' :
                                                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'text-gray-400'
                                                }`}>
                                                    {idx + 1}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{s.name}</p>
                                                    <p className="text-xs text-gray-500">{s.dept || 'N/A'} • {s.regNo}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {s.githubAnalysis?.techStack?.slice(0, 3).map((tech, i) => (
                                                        <span key={i} className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-2 py-0.5 rounded">
                                                            {tech}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
                                                    {s.githubAnalysis?.score}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- STATS / INFOS --- */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
                        <Zap className="absolute -right-4 -bottom-4 text-white/10" size={120} />
                        <h3 className="text-xl font-bold mb-2">AI Ranking Engine</h3>
                        <p className="text-sm text-white/80 leading-relaxed">
                            Our AI analyzes every student's repository profile, evaluating code quality, project complexity, and documentation standards to generate fair community rankings.
                        </p>
                        <div className="mt-6 flex items-center gap-4">
                            <div className="text-center">
                                <p className="text-2xl font-black">{students.length}</p>
                                <p className="text-[10px] uppercase font-bold text-white/60 tracking-wider">Analyzed</p>
                            </div>
                            <div className="h-8 w-[1px] bg-white/20"></div>
                            <div className="text-center">
                                <p className="text-2xl font-black">
                                    {Math.round(students.reduce((acc, curr) => acc + (curr.githubAnalysis?.score || 0), 0) / (students.length || 1))}
                                </p>
                                <p className="text-[10px] uppercase font-bold text-white/60 tracking-wider">Avg Score</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Code size={18} className="text-blue-500" /> Recent Top Performers
                        </h3>
                        <div className="space-y-4">
                            {students.slice(0, 3).map((s, i) => (
                                <div key={s.id} className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-blue-600">
                                        {s.name[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate">{s.name}</p>
                                        <p className="text-xs text-gray-500 italic">"{s.githubAnalysis?.title}"</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-purple-600">{s.githubAnalysis?.score}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- STUDENT DETAIL MODAL --- */}
            {isModalOpen && selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 animate-fade-in">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
                    
                    <div className="relative bg-white dark:bg-gray-900 w-full max-w-5xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 dark:border-gray-800 flex flex-col md:flex-row animate-zoom-in">
                        {/* Sidebar Detail (LHS) */}
                        <div className="w-full md:w-80 bg-gray-50 dark:bg-gray-800/50 p-8 border-r border-gray-100 dark:border-gray-800 flex flex-col items-center text-center overflow-y-auto">
                            <div className="relative mb-6">
                                <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-5xl font-black shadow-2xl">
                                    {selectedStudent.name[0]}
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-900 p-2 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800">
                                    <Trophy size={20} className="text-yellow-500" />
                                </div>
                            </div>
                            
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight mb-1">{selectedStudent.name}</h2>
                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-6">{selectedStudent.dept || 'Department Not Specified'}</p>
                            
                            <div className="w-full space-y-3 mb-8">
                                <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 text-left">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Developer Score</p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">{selectedStudent.githubAnalysis?.score}</span>
                                        <span className="text-sm font-bold text-gray-400 mb-2">/ 100</span>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 text-left">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Rank Status</p>
                                    <p className="text-sm font-black text-gray-900 dark:text-white">#{students.findIndex(s => s.id === selectedStudent.id) + 1} Globally</p>
                                </div>
                            </div>

                            <div className="w-full space-y-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left px-2">Links & Portfolio</p>
                                {selectedStudent.github && (
                                    <a href={selectedStudent.github.startsWith('http') ? selectedStudent.github : `https://${selectedStudent.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white dark:hover:bg-gray-900 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300">
                                        <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center">
                                            <Github size={16} />
                                        </div>
                                        GitHub Profile <ExternalLink size={14} className="ml-auto opacity-40" />
                                    </a>
                                )}
                                {selectedStudent.portfolio && (
                                    <a href={selectedStudent.portfolio.startsWith('http') ? selectedStudent.portfolio : `https://${selectedStudent.portfolio}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white dark:hover:bg-gray-900 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                            <LinkIcon size={16} />
                                        </div>
                                        Live Preview <ExternalLink size={14} className="ml-auto opacity-40" />
                                    </a>
                                )}
                                {selectedStudent.linkedin && (
                                    <a href={selectedStudent.linkedin.startsWith('http') ? selectedStudent.linkedin : `https://${selectedStudent.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white dark:hover:bg-gray-900 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300">
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
                                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-2">AI Profiling Verdict</p>
                                    <h3 className="text-3xl font-black text-gray-900 dark:text-white italic">"{selectedStudent.githubAnalysis?.title}"</h3>
                                </div>
                                <button 
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-2xl transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-10">
                                <section>
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Sparkles size={18} className="text-yellow-500" /> AI Professional Summary
                                    </h4>
                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg bg-gray-50 dark:bg-gray-800/30 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                                        {selectedStudent.githubAnalysis?.summary || selectedStudent.about || "This student has not yet provided a detailed professional summary."}
                                    </p>
                                </section>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <section>
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <BadgeCheck size={18} className="text-green-500" /> Key Strengths
                                        </h4>
                                        <ul className="space-y-3">
                                            {selectedStudent.githubAnalysis?.strengths?.map((s, i) => (
                                                <li key={i} className="flex items-start gap-3 text-gray-600 dark:text-gray-400 font-medium">
                                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                    <section>
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Target size={18} className="text-red-500" /> Areas for Growth
                                        </h4>
                                        <div className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
                                            <p className="text-red-800 dark:text-red-400 text-sm font-medium">{selectedStudent.githubAnalysis?.weakness || "Keep building and exploring new technologies!"}</p>
                                        </div>
                                    </section>
                                </div>

                                <section>
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Book size={18} className="text-blue-500" /> Verified Tech Stack
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedStudent.githubAnalysis?.techStack?.map((tech, i) => (
                                            <span key={i} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-bold border border-blue-100 dark:border-blue-800 shadow-sm">
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                </section>

                                {selectedStudent.githubAnalysis?.featuredProjects && (
                                    <section>
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <FolderOpen size={18} className="text-indigo-500" /> Featured GitHub Projects
                                        </h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            {selectedStudent.githubAnalysis.featuredProjects.map((proj, i) => (
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

                                {selectedStudent.projects && (
                                    <section>
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Code size={18} className="text-purple-500" /> Featured Projects
                                        </h4>
                                        <div className="bg-gray-50 dark:bg-gray-800/30 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 whitespace-pre-wrap text-gray-600 dark:text-gray-400 leading-relaxed italic">
                                            {selectedStudent.projects}
                                        </div>
                                    </section>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

