import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from "../../contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, GraduationCap, TrendingUp, Award, Calendar } from 'lucide-react';

export default function DashboardStats() {
    const { userDept } = useAuth();
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalAlumni: 0,
        deptCounts: [],
        yearCounts: [],
        skillDistribution: [],
        skillYearDistribution: [],
        topDept: '-',
        topYear: '-'
    });

    useEffect(() => {
        async function fetchStats() {
            try {
                // 1. Fetch Students & Alumni
                const usersQuery = query(collection(db, "users"), where("role", "in", ["student", "alumni"]));
                const usersSnapshot = await getDocs(usersQuery);

                let activeStudents = [];
                let alumniCount = 0;
                const deptMap = {};
                const yearMap = {};
                const activeStudentRegNos = new Set();
                const studentDetailsMap = {}; // New: Map to resolve Dept/Year from RegNo

                usersSnapshot.forEach(doc => {
                    const data = doc.data();
                    const studentDept = data.department || data.dept;

                    // HOD Filter: Skip if not in HOD's department
                    if (userDept && studentDept !== userDept) return;

                    if (data.role === 'alumni') {
                        alumniCount++;
                    } else if (data.role === 'student') {
                        const year = Number(data.year);
                        if (year >= 1 && year <= 4) {
                            activeStudents.push(data);
                            if (data.regNo) {
                                activeStudentRegNos.add(data.regNo);
                                studentDetailsMap[data.regNo] = {
                                    dept: studentDept || 'Unknown',
                                    year: year
                                };
                            }

                            // Count Dept
                            const dept = studentDept || 'Unknown';
                            deptMap[dept] = (deptMap[dept] || 0) + 1;

                            // Count Year
                            yearMap[year] = (yearMap[year] || 0) + 1;
                        }
                    }
                });

                const totalStudents = activeStudents.length;
                const deptCounts = Object.keys(deptMap).map(key => ({ name: key, count: deptMap[key] }));
                const yearCounts = Object.keys(yearMap).map(key => ({ name: `Year ${key}`, count: yearMap[key] }));

                // Find Top Dept & Year
                let topDept = '-';
                let maxDeptCount = 0;
                deptCounts.forEach(d => {
                    if (d.count > maxDeptCount) {
                        maxDeptCount = d.count;
                        topDept = d.name;
                    }
                });

                let topYear = '-';
                let maxYearCount = 0;
                yearCounts.forEach(y => {
                    if (y.count > maxYearCount) {
                        maxYearCount = y.count;
                        topYear = y.name;
                    }
                });

                // 2. Fetch Skills for Distribution
                const skillsSnapshot = await getDocs(collection(db, "student_skills"));
                const skillMap = {};
                const skillYearMap = {};

                skillsSnapshot.forEach(doc => {
                    const data = doc.data();
                    // LOOKUP: Use the map to get accurate Dept/Year for this skill entry
                    const studentInfo = studentDetailsMap[data.regNo];

                    if (studentInfo) {
                        const dept = studentInfo.dept;
                        const year = `Year ${studentInfo.year}`;

                        // HOD Filter is already implicitly applied because studentDetailsMap only contains valid students

                        const points = Number(data.points) || 0;
                        skillMap[dept] = (skillMap[dept] || 0) + points;
                        skillYearMap[year] = (skillYearMap[year] || 0) + points;
                    }
                });

                const skillDistribution = Object.keys(skillMap).map(key => ({ name: key, value: skillMap[key] }));
                const skillYearDistribution = Object.keys(skillYearMap).map(key => ({ name: key, value: skillYearMap[key] }));

                setStats({
                    totalStudents,
                    totalAlumni: alumniCount,
                    deptCounts,
                    yearCounts,
                    skillDistribution,
                    skillYearDistribution,
                    topDept,
                    topYear
                });

            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            }
        }

        fetchStats();
    }, [userDept]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

    return (
        <div className="space-y-6 font-sans">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between transition-colors">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">Total Students</p>
                        <h3 className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalStudents}</h3>
                    </div>
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Users size={32} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between transition-colors">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">Total Alumni</p>
                        <h3 className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalAlumni}</h3>
                    </div>
                    <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center text-green-600 dark:text-green-400">
                        <GraduationCap size={32} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between transition-colors">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">{userDept ? 'Top Year' : 'Top Dept'}</p>
                        <h3 className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{userDept ? stats.topYear : stats.topDept}</h3>
                    </div>
                    <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                        {userDept ? <Calendar size={32} /> : <Award size={32} />}
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <Users size={20} className="text-gray-400" />
                        {userDept ? 'Students by Year' : 'Students by Department'}
                    </h3>
                    <div className="h-80 md:h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={userDept ? stats.yearCounts : stats.deptCounts}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(156, 163, 175, 0.1)', radius: 8 }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px', backgroundColor: '#1f2937', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 6, 6]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <Award size={20} className="text-gray-400" />
                        {userDept ? 'Skill Points by Year' : 'Skill Points by Department'}
                    </h3>
                    <div className="h-80 md:h-96">
                        {(userDept ? stats.skillYearDistribution : stats.skillDistribution).length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={userDept ? stats.skillYearDistribution : stats.skillDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {(userDept ? stats.skillYearDistribution : stats.skillDistribution).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px', backgroundColor: '#1f2937', color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap justify-center gap-4 mt-4">
                                    {(userDept ? stats.skillYearDistribution : stats.skillDistribution).map((entry, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{entry.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <Award size={48} className="mb-4 opacity-20" />
                                <p>No skill points recorded yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
