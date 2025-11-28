import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userDept, setUserDept] = useState(null);
    const [loading, setLoading] = useState(true);

    async function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Firebase Auth User (Admin/Staff/HOD)
                setCurrentUser(user);
                try {
                    const userDoc = await getDoc(doc(db, "users", user.email));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserRole(data.role);
                        // Only set userDept if the role is 'hod'. Admins should have null (full access).
                        setUserDept(data.role === 'hod' ? (data.dept || null) : null);
                    } else {
                        setUserRole("admin"); // Default fallback
                        setUserDept(null);
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                }
            } else {
                // Check for manual student session
                const studentSession = localStorage.getItem('student_session');
                if (studentSession) {
                    const studentUser = JSON.parse(studentSession);
                    setCurrentUser(studentUser);
                    setUserRole('student');
                } else {
                    setCurrentUser(null);
                    setUserRole(null);
                }
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    async function logout() {
        localStorage.removeItem('student_session');
        setCurrentUser(null);
        setUserRole(null);
        await signOut(auth);
    }

    async function loginStudent(regNo) {
        try {
            const userDocRef = doc(db, "users", regNo);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.role === 'student') {
                    // Manually set the user state for student "login"
                    // Since we aren't using Firebase Auth for students, we mock the user object
                    const studentUser = {
                        uid: regNo,
                        email: userData.email,
                        displayName: userData.name,
                        photoURL: null,
                        isStudent: true // Flag to identify student session
                    };
                    setCurrentUser(studentUser);
                    setUserRole('student');
                    localStorage.setItem('student_session', JSON.stringify(studentUser));
                    return true;
                }
            }
            throw new Error("Student not found");
        } catch (error) {
            console.error("Student login error:", error);
            throw error;
        }
    }

    const value = {
        currentUser,
        userRole,
        userDept,
        login,
        loginStudent,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
