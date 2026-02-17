import { useState, useEffect } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import { db } from '../../config/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { GraduationCap, Award, List, ArrowRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudentOverview() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [studentData, setStudentData] = useState(null);
    const [stats, setStats] = useState({ points: 0, activities: 0 });
    const [recentSkills, setRecentSkills] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (currentUser?.uid) {
                try {
                    // 1. Fetch Student Profile
                    const docRef = doc(db, "users", currentUser.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setStudentData(data);

                        let totalPoints = 0;
                        let totalActivities = 0;
                        const skillsList = [];

                        // 2. A. Add PS Portal Points (from User Doc)
                        if (data.psPortalData && Array.isArray(data.psPortalData)) {
                            data.psPortalData.forEach(lvl => {
                                const pts = Number(lvl.points) || 0;
                                if (pts > 0) {
                                    totalPoints += pts;
                                    totalActivities += 1;
                                    skillsList.push({
                                        id: `ps-${lvl.label}`,
                                        skillName: `${lvl.label} (Sheet)`,
                                        points: pts,
                                        date: data.updatedAt || new Date().toISOString(),
                                        isExternal: true
                                    });
                                }
                            });
                        }

                        // 2. B. Add Other Skills Points (from User Doc)
                        if (data.otherSkillsData && Array.isArray(data.otherSkillsData)) {
                            data.otherSkillsData.forEach(skill => {
                                const pts = Number(skill.points) || 0;
                                if (pts > 0) {
                                    totalPoints += pts;
                                    totalActivities += 1;
                                    skillsList.push({
                                        id: `other-${skill.name}`,
                                        skillName: `${skill.name} (Sheet)`,
                                        points: pts,
                                        date: data.updatedAt || new Date().toISOString(),
                                        isExternal: true
                                    });
                                }
                            });
                        }

                        // 3. Fetch Manual Skills Summary if regNo exists
                        if (data.regNo) {
                            const skillsRef = collection(db, "student_skills");
                            const regNoStr = String(data.regNo);
                            const regNoNum = Number(data.regNo);
                            const searchValues = [regNoStr];
                            if (!isNaN(regNoNum)) searchValues.push(regNoNum);

                            const q = query(skillsRef, where("regNo", "in", searchValues));
                            const snapshot = await getDocs(q);

                            snapshot.forEach(doc => {
                                const skill = doc.data();
                                totalPoints += Number(skill.points) || 0;
                                totalActivities += 1;
                                skillsList.push({ id: doc.id, ...skill });
                            });
                        }

                        // Sort by date desc for recent list
                        skillsList.sort((a, b) => new Date(b.date) - new Date(a.date));

                        setStats({
                            points: totalPoints,
                            activities: totalActivities
                        });
                        setRecentSkills(skillsList.slice(0, 3));
                    }
                } catch (error) {
                    console.error("Error fetching dashboard data:", error);
                }
            }
            setLoading(false);
        }
        fetchData();
    }, [currentUser]);

    return (
        <div className="space-y-8 font-sans">
            {/* Welcome Banner */}
            <div className="relative rounded-3xl p-6 md:p-8 text-white shadow-xl overflow-hidden min-h-[180px] flex flex-col justify-center">
                {/* Background Image with Overlay */}
                <div
                    className="absolute inset-0 bg-cover bg-center z-0"
                    style={{ backgroundImage: "url('https://www.mtec.ac.in/cs-content/themes/mtec/images/about_img.webp')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-blue-800/80 z-0 backdrop-blur-[2px]" />

                <div className="relative z-10">
                    <h1 className="text-xl md:text-3xl font-bold mb-2 text-white">Welcome back, {studentData?.name || 'Talent'}!</h1>
                    <p className="text-blue-100 text-lg text-white max-w-xl">TalentScout | Your professional excellence starts here.</p>
                </div>

                <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4 z-0">
                    <GraduationCap size={200} />
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-600 dark:bg-gray-900 p-6 rounded-3xl border border-blue-500 dark:border-gray-800 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                    <div>
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-yellow-300 mb-3">
                            <Award size={24} />
                        </div>
                        <p className="text-blue-100 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">Total Points</p>
                        <h3 className="text-4xl font-bold text-white mt-1">{stats.points}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">Activities Logged</p>
                        <h3 className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{stats.activities}</h3>
                    </div>
                    <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                        <List size={32} />
                    </div>
                </div>
            </div>

            {/* Recent Achievements */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Star size={24} className="text-yellow-500" />
                        Recent Achievements
                    </h3>
                    <button
                        onClick={() => navigate('/student/skills')}
                        className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                    >
                        View Full Report <ArrowRight size={16} />
                    </button>
                </div>

                <div className="space-y-4">
                    {recentSkills.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">No activities recorded yet.</div>
                    ) : (
                        recentSkills.map((skill) => (
                            <div key={skill.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-gray-900 dark:text-white">{skill.skillName}</h4>
                                        {skill.isExternal && (
                                            <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                Sheet
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">{new Date(skill.date).toLocaleDateString()}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-700 px-3 py-1 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600 font-bold text-blue-600 dark:text-blue-400 text-sm">
                                    +{skill.points} pts
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
