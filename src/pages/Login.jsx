import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { GraduationCap, ShieldCheck, User, ArrowRight, Loader2, Building2 } from "lucide-react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login, loginStudent, logout, userRole } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (userRole === 'admin' || userRole === 'hod') navigate('/admin');
        else if (userRole === 'student') navigate('/student');
    }, [userRole, navigate]);

    const [activeTab, setActiveTab] = useState('student'); // 'student', 'admin', 'dept'
    const [regNo, setRegNo] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setError("");
            setLoading(true);

            if (activeTab === 'student') {
                await loginStudent(regNo);
            } else {
                // Admin or Dept Login
                const userCred = await login(email, password);
                const user = userCred.user;

                // Strict Role Check
                const userDoc = await getDoc(doc(db, "users", user.email));
                if (userDoc.exists()) {
                    const role = userDoc.data().role;

                    if (activeTab === 'admin' && role !== 'admin') {
                        await logout();
                        throw new Error("Access Denied: This login is for Admins only. Please use the Department login.");
                    }

                    if (activeTab === 'dept' && role !== 'hod') {
                        await logout();
                        throw new Error("Access Denied: This login is for HODs only. Please use the Admin login.");
                    }
                } else {
                    // Fallback if user doc doesn't exist (shouldn't happen for seeded users)
                    if (activeTab === 'dept') {
                        await logout();
                        throw new Error("User record not found.");
                    }
                }
            }
        } catch (err) {
            console.error(err);
            // Firebase auth errors or our custom errors
            let msg = err.message;
            if (msg.includes("auth/invalid-credential")) msg = "Invalid email or password.";
            setError(msg.replace("Firebase: ", "").replace("Error: ", ""));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                            <GraduationCap size={32} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">SMTEC</h1>
                        <p className="text-blue-100 mt-2 font-medium">College Management System</p>
                    </div>
                    {/* Decorative Circles */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full translate-x-1/2 translate-y-1/2 blur-2xl" />
                </div>

                {/* Tabs */}
                <div className="flex p-2 bg-gray-50/50 border-b border-gray-100 gap-1">
                    <button
                        onClick={() => setActiveTab('student')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${activeTab === 'student'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        <User size={16} />
                        Student
                    </button>
                    <button
                        onClick={() => setActiveTab('admin')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${activeTab === 'admin'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        <ShieldCheck size={16} />
                        Admin
                    </button>
                    <button
                        onClick={() => setActiveTab('dept')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${activeTab === 'dept'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        <Building2 size={16} />
                        Dept
                    </button>
                </div>

                {/* Form */}
                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {activeTab === 'student' ? (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1">Register Number</label>
                                <input
                                    type="text"
                                    value={regNo}
                                    onChange={(e) => setRegNo(e.target.value)}
                                    required
                                    placeholder="e.g. 713521104001"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono text-gray-900"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">
                                        {activeTab === 'admin' ? 'Admin Email' : 'HOD Email'}
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder={activeTab === 'admin' ? "admin@smtec.edu" : "hod@smtec.edu"}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900"
                                    />
                                </div>
                            </>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <>
                                    Sign In <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
