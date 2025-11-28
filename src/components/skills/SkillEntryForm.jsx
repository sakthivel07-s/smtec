import { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from "../../contexts/AuthContext";
import { Plus, Save, User, Calendar, Award, Hash, BookOpen, Loader2, GraduationCap, Building2 } from 'lucide-react';
import CustomDropdown from '../common/CustomDropdown';

export default function SkillEntryForm() {
    const { userDept } = useAuth();
    const [formData, setFormData] = useState({
        regNo: '',
        skillName: '',
        points: '',
        date: new Date().toISOString().split('T')[0],
        semester: '1',
        year: '1'
    });
    const [studentDetails, setStudentDetails] = useState({
        name: '',
        dept: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetchingStudent, setFetchingStudent] = useState(false);
    const [message, setMessage] = useState('');

    // New State for "Select from List" mode
    const [entryMode, setEntryMode] = useState('regNo'); // 'regNo' or 'select'
    const [selectedDept, setSelectedDept] = useState(userDept || '');
    const [selectedYear, setSelectedYear] = useState('');
    const [studentList, setStudentList] = useState([]);

    // Fetch students when Dept/Year changes in 'select' mode
    useEffect(() => {
        const fetchStudentsByFilter = async () => {
            if (entryMode === 'select' && selectedDept && selectedYear) {
                try {
                    // Note: 'department' field might be 'dept' in some docs, check your schema
                    // Assuming 'department' or 'dept' is consistent or we query both?
                    // Let's try querying by 'dept' first as per seed script
                    const q = query(
                        collection(db, "users"),
                        where("role", "==", "student"),
                        where("dept", "==", selectedDept),
                        where("year", "==", Number(selectedYear)) // Ensure number type match
                    );
                    const snapshot = await getDocs(q);
                    const students = snapshot.docs.map(doc => doc.data());
                    setStudentList(students);
                } catch (error) {
                    console.error("Error fetching student list:", error);
                }
            } else {
                setStudentList([]);
            }
        };
        fetchStudentsByFilter();
    }, [entryMode, selectedDept, selectedYear]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Auto-fetch student details when regNo changes
    useEffect(() => {
        const fetchStudent = async () => {
            if (formData.regNo.length >= 5) { // Only fetch if regNo is long enough
                setFetchingStudent(true);
                try {
                    const q = query(collection(db, "users"), where("regNo", "==", formData.regNo), where("role", "==", "student"));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const student = querySnapshot.docs[0].data();
                        const sDept = student.dept || student.department;

                        // HOD Restriction Check
                        if (userDept && sDept !== userDept) {
                            setStudentDetails({ name: '', dept: '' });
                            // Optional: You could show a specific error message state here
                            console.warn("Cannot access student from another department");
                        } else {
                            setStudentDetails({
                                name: student.name || '',
                                dept: sDept || ''
                            });

                            // Auto-fill year and semester if available
                            setFormData(prev => ({
                                ...prev,
                                year: student.year || prev.year,
                                semester: student.semester || ((student.year * 2) - 1) || prev.semester // Fallback to calc if sem missing
                            }));
                        }
                    } else {
                        setStudentDetails({ name: '', dept: '' });
                    }
                } catch (error) {
                    console.error("Error fetching student:", error);
                } finally {
                    setFetchingStudent(false);
                }
            } else {
                setStudentDetails({ name: '', dept: '' });
            }
        };

        const timeoutId = setTimeout(fetchStudent, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [formData.regNo, userDept]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            await addDoc(collection(db, "student_skills"), {
                ...formData,
                points: Number(formData.points),
                semester: Number(formData.semester),
                year: Number(formData.year),
                studentName: studentDetails.name, // Save name for easier reporting
                studentDept: studentDetails.dept, // Save dept for easier reporting
                createdAt: serverTimestamp()
            });
            setMessage('Success');
            setFormData({ ...formData, skillName: '', points: '' });

            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error adding skill:", error);
            setMessage('Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden sticky top-6 font-sans transition-colors">
            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl flex items-center justify-between">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white tracking-tight">Add New Skill</h3>
                <div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center">
                    <Plus size={16} />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {/* Mode Toggle */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl transition-colors">
                    <button
                        type="button"
                        onClick={() => setEntryMode('regNo')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${entryMode === 'regNo' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        By Register No
                    </button>
                    <button
                        type="button"
                        onClick={() => setEntryMode('select')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${entryMode === 'select' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Select from List
                    </button>
                </div>

                {/* Group 1: Student Details */}
                <div className="space-y-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Student Information</label>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-2 space-y-2 border border-gray-100 dark:border-gray-700 transition-colors">

                        {entryMode === 'regNo' ? (
                            <div className="relative flex items-center px-4 py-2">
                                <Hash size={18} className="text-gray-400 mr-4" />
                                <input
                                    type="text"
                                    name="regNo"
                                    value={formData.regNo}
                                    onChange={handleChange}
                                    placeholder="Register Number"
                                    className="w-full bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                                    required={entryMode === 'regNo'}
                                />
                                {fetchingStudent && <Loader2 size={16} className="animate-spin text-blue-500" />}
                            </div>
                        ) : (
                            <div className="space-y-2 p-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <CustomDropdown
                                        placeholder="Select Dept"
                                        value={selectedDept}
                                        onChange={(e) => setSelectedDept(e.target.value)}
                                        options={(userDept ? [userDept] : ["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT", "AI&DS"])}
                                        disabled={!!userDept}
                                        className="w-full"
                                    />
                                    <CustomDropdown
                                        placeholder="Select Year"
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        options={[1, 2, 3, 4].map(y => ({ value: y, label: `Year ${y}` }))}
                                        className="w-full"
                                    />
                                </div>
                                <CustomDropdown
                                    placeholder="Select Student"
                                    value={formData.regNo} // Control this with regNo if possible, or leave empty if just a trigger
                                    onChange={(e) => {
                                        const student = studentList.find(s => s.regNo === e.target.value);
                                        if (student) {
                                            setFormData(prev => ({
                                                ...prev,
                                                regNo: student.regNo,
                                                year: student.year,
                                                semester: student.semester || ((student.year * 2) - 1)
                                            }));
                                            setStudentDetails({
                                                name: student.name,
                                                dept: student.dept || student.department
                                            });
                                        }
                                    }}
                                    options={studentList.map(s => ({ value: s.regNo, label: `${s.name} (${s.regNo})` }))}
                                    disabled={!selectedDept || !selectedYear}
                                    className="w-full"
                                />
                            </div>
                        )}

                        {/* Auto-filled Read-only Fields */}
                        <div className="h-px bg-gray-200 dark:bg-gray-700 mx-4" />
                        <div className="relative flex items-center px-4 py-2 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl mx-2">
                            <User size={18} className="text-blue-400 mr-4" />
                            <input
                                type="text"
                                value={studentDetails.name}
                                placeholder="Student Name (Auto-filled)"
                                className="w-full bg-transparent border-none focus:ring-0 text-blue-900 dark:text-blue-300 font-medium placeholder-blue-300 dark:placeholder-blue-700"
                                readOnly
                                disabled
                            />
                        </div>
                        <div className="relative flex items-center px-4 py-2 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl mx-2">
                            <Building2 size={18} className="text-blue-400 mr-4" />
                            <input
                                type="text"
                                value={studentDetails.dept}
                                placeholder="Department (Auto-filled)"
                                className="w-full bg-transparent border-none focus:ring-0 text-blue-900 dark:text-blue-300 font-medium placeholder-blue-300 dark:placeholder-blue-700"
                                readOnly
                                disabled
                            />
                        </div>
                    </div>
                </div>

                {/* Group 2: Academic Details */}
                <div className="space-y-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Academic Year</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-2 border border-gray-100 dark:border-gray-700 flex items-center gap-3 transition-colors">
                            <BookOpen size={18} className="text-gray-400" />
                            <div className="flex-1">
                                <CustomDropdown
                                    value={formData.year}
                                    onChange={(e) => handleChange({ target: { name: 'year', value: e.target.value } })}
                                    options={[1, 2, 3, 4].map(y => ({ value: y, label: `Year ${y}` }))}
                                    variant="ghost"
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-2 border border-gray-100 dark:border-gray-700 flex items-center gap-3 transition-colors">
                            <GraduationCap size={18} className="text-gray-400" />
                            <div className="flex-1">
                                <CustomDropdown
                                    value={formData.semester}
                                    onChange={(e) => handleChange({ target: { name: 'semester', value: e.target.value } })}
                                    options={[1, 2, 3, 4, 5, 6, 7, 8].map(s => ({ value: s, label: `Sem ${s}` }))}
                                    variant="ghost"
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-700 flex items-center gap-3 transition-colors">
                        <Calendar size={18} className="text-gray-400" />
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            className="w-full bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white font-medium dark:[color-scheme:dark]"
                            required
                        />
                    </div>
                </div>

                {/* Group 3: Skill Details */}
                <div className="space-y-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Achievement</label>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-2 space-y-2 border border-gray-100 dark:border-gray-700 transition-colors">
                        <div className="relative flex items-center px-4 py-2">
                            <Award size={18} className="text-gray-400 mr-4" />
                            <input
                                type="text"
                                name="skillName"
                                value={formData.skillName}
                                onChange={handleChange}
                                placeholder="Activity Name (e.g. Hackathon)"
                                className="w-full bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                                required
                            />
                        </div>
                        <div className="h-px bg-gray-200 dark:bg-gray-700 mx-4" />
                        <div className="relative flex items-center px-4 py-2">
                            <div className="w-[18px] mr-4 text-center font-bold text-gray-400 text-sm">Pt</div>
                            <input
                                type="number"
                                name="points"
                                value={formData.points}
                                onChange={handleChange}
                                placeholder="Points Awarded"
                                className="w-full bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                                required
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-black dark:bg-white text-white dark:text-black h-14 rounded-2xl font-semibold text-lg shadow-lg shadow-gray-200 dark:shadow-none hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    disabled={loading || !studentDetails.name} // Disable if student not found
                >
                    {loading ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <>
                            <span>Save Record</span>
                        </>
                    )}
                </button>

                {message && (
                    <div className={`text-center text-sm font-medium animate-fade-in ${message === 'Error' ? 'text-red-500' : 'text-green-500'}`}>
                        {message === 'Error' ? 'Failed to save record.' : 'Record saved successfully.'}
                    </div>
                )}
            </form>
        </div>
    );
}
