import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from "../../contexts/AuthContext";
import { Trophy, Medal, Crown, Filter, Search, Award, User } from 'lucide-react';
import CustomDropdown from '../common/CustomDropdown';

export default function Leaderboard() {
    const { currentUser } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserProfile, setCurrentUserProfile] = useState(null);
    const [filter, setFilter] = useState({
        dept: 'All',
        year: 'All'
    });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 0. Fetch Current User Profile (to identify "Me")
                if (currentUser?.uid) {
                    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                    if (userDoc.exists()) {
                        setCurrentUserProfile(userDoc.data());
                    }
                }

                // 1. Fetch all students (to get current Year/Dept)
                const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
                const studentsSnapshot = await getDocs(studentsQuery);
                const studentMap = {};

                studentsSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.regNo) {
                        const reg = String(data.regNo).trim();
                        let basePoints = 0;
                        let initialActivities = 0;

                        // 1.1 Add PS Portal Points
                        if (data.psPortalData && Array.isArray(data.psPortalData)) {
                            data.psPortalData.forEach(lvl => {
                                const pts = Number(lvl.points) || 0;
                                if (pts > 0) {
                                    basePoints += pts;
                                    initialActivities += 1;
                                }
                            });
                        }

                        // 1.2 Add Other Skills Points
                        if (data.otherSkillsData && Array.isArray(data.otherSkillsData)) {
                            data.otherSkillsData.forEach(skill => {
                                const pts = Number(skill.points) || 0;
                                if (pts > 0) {
                                    basePoints += pts;
                                    initialActivities += 1;
                                }
                            });
                        }

                        studentMap[reg] = {
                            id: doc.id,
                            regNo: reg,
                            name: data.name,
                            dept: data.dept || data.department,
                            year: Number(data.year),
                            points: basePoints,
                            activities: initialActivities
                        };
                    }
                });

                // 2. Fetch all skills (to calculate Total Points)
                const skillsSnapshot = await getDocs(collection(db, "student_skills"));
                skillsSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const reg = String(data.regNo).trim();
                    if (studentMap[reg]) {
                        studentMap[reg].points += Number(data.points) || 0;
                        studentMap[reg].activities += 1;
                    }
                });

                setStudents(Object.values(studentMap));

            } catch (error) {
                console.error("Error fetching leaderboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser]);

    const filteredStudents = useMemo(() => {
        let result = students;

        // Apply Filters
        if (filter.dept !== 'All') {
            result = result.filter(s => s.dept === filter.dept);
        }
        if (filter.year !== 'All') {
            result = result.filter(s => s.year === Number(filter.year));
        }

        // Apply Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(s =>
                s.name.toLowerCase().includes(lowerTerm) ||
                s.regNo.toLowerCase().includes(lowerTerm)
            );
        }

        // Sort by Points (Desc)
        return result.sort((a, b) => b.points - a.points);
    }, [students, filter, searchTerm]);

    // Find My Rank
    const myRankInfo = useMemo(() => {
        if (!currentUserProfile || currentUserProfile.role !== 'student') return null;
        const index = filteredStudents.findIndex(s => s.regNo === currentUserProfile.regNo);
        if (index !== -1) {
            return {
                rank: index + 1,
                data: filteredStudents[index]
            };
        }
        return null;
    }, [filteredStudents, currentUserProfile]);

    const getRankIcon = (index) => {
        if (index === 0) return <Crown className="text-yellow-500 fill-yellow-500" size={24} />;
        if (index === 1) return <Medal className="text-gray-400 fill-gray-400" size={24} />;
        if (index === 2) return <Medal className="text-amber-700 fill-amber-700" size={24} />;
        return <span className="text-gray-500 font-bold w-6 text-center">{index + 1}</span>;
    };

    const getRowStyle = (index, isMe) => {
        if (isMe) return "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 ring-1 ring-blue-200 dark:ring-blue-800 shadow-sm z-10 relative"; // Highlight for Me
        if (index === 0) return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/30";
        if (index === 1) return "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800";
        if (index === 2) return "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/30";
        return "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800";
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in p-6 max-w-7xl mx-auto font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-200 dark:shadow-none">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                        <Trophy className="text-yellow-300 fill-yellow-300" size={32} />
                        Skill Leaderboard
                    </h1>
                    <p className="text-blue-100 mt-2 opacity-90 text-white">
                        Top achievers across departments and years
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center min-w-[100px]">
                        <div className="text-2xl font-bold text-white">{students.length}</div>
                        <div className="text-xs text-blue-100 uppercase tracking-wider text-white">Students</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center min-w-[100px]">
                        <div className="text-2xl font-bold text-white">
                            {students.reduce((acc, s) => acc + s.points, 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-blue-100 uppercase tracking-wider text-white">Total Points</div>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-20 transition-colors">
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {/* Department Filter */}
                    <div className="relative group w-48">
                        <CustomDropdown
                            value={filter.dept}
                            onChange={(e) => setFilter(prev => ({ ...prev, dept: e.target.value }))}
                            options={[
                                { value: "All", label: "All Departments" },
                                "CSE", "ECE", "EEE", "MECH", "CIVIL", "AI&DS"
                            ]}
                            className="w-full"
                        />
                    </div>

                    {/* Year Filter */}
                    <div className="relative w-40">
                        <CustomDropdown
                            value={filter.year}
                            onChange={(e) => setFilter(prev => ({ ...prev, year: e.target.value }))}
                            options={[
                                { value: "All", label: "All Years" },
                                { value: "1", label: "Year 1" },
                                { value: "2", label: "Year 2" },
                                { value: "3", label: "Year 3" },
                                { value: "4", label: "Year 4" }
                            ]}
                            className="w-full"
                        />
                    </div>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-64">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search student..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all"
                    />
                </div>
            </div>

            {/* My Rank Card (Sticky/Fixed) */}
            {myRankInfo && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                            #{myRankInfo.rank}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Your Current Rank</h3>
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                {filter.dept === 'All' ? 'Overall' : filter.dept} {filter.year === 'All' ? '' : `• Year ${filter.year}`}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{myRankInfo.data.points}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Points</div>
                    </div>
                </div>
            )}

            {/* Leaderboard Table */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 transition-colors">
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rank</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Year</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Activities</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Points</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map((student, index) => {
                                    const isMe = currentUserProfile?.regNo === student.regNo;
                                    return (
                                        <tr
                                            key={student.id}
                                            className={`transition-all duration-200 ${getRowStyle(index, isMe)}`}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={`flex items-center justify-center w-10 h-10 rounded-full shadow-sm border ${isMe ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                                                    {isMe ? <span className="font-bold">{index + 1}</span> : getRankIcon(index)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-100 dark:shadow-none">
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                                                            {student.name} {isMe && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">You</span>}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{student.regNo}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                                    {student.dept}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                                                    Year {student.year}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-1 text-gray-600 dark:text-gray-400">
                                                    <Award size={14} />
                                                    <span className="font-semibold">{student.activities}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="text-lg font-bold text-gray-900 dark:text-white">{student.points}</div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                                        No students found matching the criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
