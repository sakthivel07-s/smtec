import { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from "../../contexts/AuthContext";
import { X, Save, User, Mail, Building2, Calendar, Loader2, BookOpen } from 'lucide-react';
import CustomDropdown from '../common/CustomDropdown';

export default function StudentForm({ student, onClose, onSuccess }) {
    const { userDept } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        dept: userDept || 'CSE',
        year: 1,
        semester: 1,
        regNo: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (student) {
            setFormData({
                ...student,
                semester: student.semester || ((student.year * 2) - 1) // Default sem calculation if missing
            });
        }
    }, [student]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = {
                ...formData,
                role: 'student',
                updatedAt: new Date().toISOString()
            };

            if (student?.id) {
                await setDoc(doc(db, "users", student.id), data, { merge: true });
            } else {
                // Use regNo as ID if available, else email
                const docId = formData.regNo || formData.email;
                await setDoc(doc(db, "users", docId), {
                    ...data,
                    createdAt: new Date().toISOString()
                });
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving student:", error);
            alert("Error saving student: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-800 transition-colors max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between transition-colors shrink-0">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                        {student ? 'Edit Student' : 'Add New Student'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Full Name</label>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700 flex items-center gap-3 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                        <User size={18} className="text-gray-400" />
                                        <input
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white font-medium placeholder-gray-400"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Register No</label>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700 flex items-center gap-3 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                        <span className="text-gray-400 font-bold text-sm">#</span>
                                        <input
                                            required
                                            value={formData.regNo}
                                            onChange={e => setFormData({ ...formData, regNo: e.target.value })}
                                            className="w-full bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white font-medium placeholder-gray-400"
                                            placeholder="9530..."
                                            disabled={!!student}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700 flex items-center gap-3 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                    <Mail size={18} className="text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        disabled={!!student}
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white font-medium placeholder-gray-400"
                                        placeholder="student@smtec.edu"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Department</label>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2 border border-gray-100 dark:border-gray-700 flex items-center gap-3 transition-colors">
                                        <Building2 size={18} className="text-gray-400" />
                                        <div className="flex-1">
                                            <CustomDropdown
                                                value={formData.dept}
                                                onChange={e => setFormData({ ...formData, dept: e.target.value })}
                                                options={(userDept ? [userDept] : ["CSE", "ECE", "MECH", "CIVIL", "EEE", "IT", "AI&DS"])}
                                                disabled={!!userDept}
                                                variant="ghost"
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Year</label>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700 flex items-center gap-3 transition-colors">
                                        <Calendar size={18} className="text-gray-400" />
                                        <input
                                            type="number"
                                            min="1"
                                            max="4"
                                            value={formData.year}
                                            onChange={e => setFormData({ ...formData, year: Number(e.target.value) })}
                                            className="w-full bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white font-medium"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Semester</label>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2 border border-gray-100 dark:border-gray-700 flex items-center gap-3 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                    <BookOpen size={18} className="text-gray-400" />
                                    <div className="flex-1">
                                        <CustomDropdown
                                            value={formData.semester}
                                            onChange={e => setFormData({ ...formData, semester: Number(e.target.value) })}
                                            options={[1, 2, 3, 4, 5, 6, 7, 8].map(s => ({ value: s, label: `Semester ${s}` }))}
                                            variant="ghost"
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] bg-black dark:bg-white text-white dark:text-black py-3.5 rounded-xl font-bold shadow-lg shadow-gray-200 dark:shadow-none hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Save Student</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
