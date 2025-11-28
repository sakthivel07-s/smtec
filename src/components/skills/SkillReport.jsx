import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calendar, Award, TrendingUp, List, AlertCircle, BarChart2, Clock } from 'lucide-react';

export default function SkillReport({ regNo }) {
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPoints, setTotalPoints] = useState(0);
    const [viewMode, setViewMode] = useState('activities'); // activities, day, week, month, semester, year

    useEffect(() => {
        const fetchSkills = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, "student_skills"),
                    where("regNo", "==", regNo)
                );
                const snapshot = await getDocs(q);
                let skillList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Sort by date descending (Newest first) for the list view
                skillList.sort((a, b) => new Date(b.date) - new Date(a.date));
                setSkills(skillList);

                // Calculate Total Points
                const total = skillList.reduce((sum, skill) => sum + (Number(skill.points) || 0), 0);
                setTotalPoints(total);

            } catch (error) {
                console.error("Error fetching skills:", error);
            } finally {
                setLoading(false);
            }
        };

        if (regNo) {
            fetchSkills();
        }
    }, [regNo]);

    // Helper to get week number
    const getWeekNumber = (d) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNo;
    };

    const chartData = useMemo(() => {
        if (!skills.length) return [];

        if (viewMode === 'activities') {
            // Individual Activities (Oldest First for Chart)
            return [...skills].reverse().map(skill => ({
                name: skill.skillName.length > 10 ? skill.skillName.substring(0, 10) + '...' : skill.skillName,
                fullName: skill.skillName,
                date: new Date(skill.date).toLocaleDateString(),
                points: Number(skill.points) || 0,
                type: 'Activity'
            }));
        }

        const map = {};

        skills.forEach(skill => {
            const date = new Date(skill.date);
            let key, sortValue, label;

            if (viewMode === 'day') {
                key = date.toISOString().split('T')[0]; // YYYY-MM-DD
                label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                sortValue = date.getTime();
            } else if (viewMode === 'week') {
                const weekNum = getWeekNumber(date);
                const year = date.getFullYear();
                key = `${year}-W${weekNum}`;
                label = `W${weekNum} ${year}`;
                sortValue = date.getTime(); // Approx sorting by activity date
            } else if (viewMode === 'month') {
                key = `${date.getFullYear()}-${date.getMonth()}`;
                label = date.toLocaleString('default', { month: 'short', year: '2-digit' });
                sortValue = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
            } else if (viewMode === 'semester') {
                key = `Sem ${skill.semester}`;
                label = `Sem ${skill.semester}`;
                sortValue = Number(skill.semester) || 0;
            } else if (viewMode === 'year') {
                key = `Year ${skill.year}`;
                label = `Year ${skill.year}`;
                sortValue = Number(skill.year) || 0;
            }

            if (!map[key]) {
                map[key] = { name: label, points: 0, count: 0, sortValue, fullName: label };
            }
            map[key].points += Number(skill.points) || 0;
            map[key].count += 1;
        });

        return Object.values(map).sort((a, b) => a.sortValue - b.sortValue);

    }, [skills, viewMode]);

    if (loading) return <div className="p-12 text-center text-gray-400">Loading analysis...</div>;

    const tabs = [
        { id: 'activities', label: 'Activities' },
        { id: 'day', label: 'Daily' },
        { id: 'week', label: 'Weekly' },
        { id: 'month', label: 'Monthly' },
        { id: 'semester', label: 'Semester' },
        { id: 'year', label: 'Year' },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 dark:shadow-none">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Award size={24} />
                        </div>
                        <span className="text-blue-100 font-medium">Total Points</span>
                    </div>
                    <h3 className="text-4xl font-bold text-white">{totalPoints}</h3>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                            <List size={24} />
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Total Activities</span>
                    </div>
                    <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{skills.length}</h3>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
                            <TrendingUp size={24} />
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Average / Activity</span>
                    </div>
                    <h3 className="text-4xl font-bold text-gray-900 dark:text-white">
                        {skills.length > 0 ? (totalPoints / skills.length).toFixed(1) : 0}
                    </h3>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Analysis Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BarChart2 size={20} className="text-blue-500" />
                            Performance Analysis
                        </h3>

                        {/* View Selector */}
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl overflow-x-auto custom-scrollbar transition-colors">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setViewMode(tab.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${viewMode === tab.id
                                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar pb-4">
                        <div style={{ minWidth: '100%', width: Math.max(chartData.length * 60, 600), height: 300 }}>
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9ca3af', fontSize: 10 }}
                                            dy={10}
                                            interval={0}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', backgroundColor: '#1f2937', color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value) => [value, 'Points']}
                                            labelFormatter={(label, payload) => {
                                                if (payload && payload.length > 0) {
                                                    return payload[0].payload.fullName;
                                                }
                                                return label;
                                            }}
                                        />
                                        <Bar
                                            dataKey="points"
                                            fill="#3b82f6"
                                            radius={[6, 6, 0, 0]}
                                            barSize={40}
                                            activeBar={{ fill: '#2563eb' }}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <AlertCircle size={32} className="mb-2 opacity-50" />
                                    <p>No data available for chart</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Activities List */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-[400px] transition-colors">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <List size={20} className="text-purple-500" />
                        Recent Activities
                    </h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {skills.length === 0 ? (
                            <div className="text-center text-gray-400 py-12">No activities recorded yet.</div>
                        ) : (
                            <div className="space-y-4">
                                {skills.map((skill) => (
                                    <div key={skill.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white">{skill.skillName}</h4>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {new Date(skill.date).toLocaleDateString()}
                                                </span>
                                                <span className="bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                                    Year {skill.year} • Sem {skill.semester}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">+{skill.points}</span>
                                            <span className="text-xs text-gray-400 font-medium">Points</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
