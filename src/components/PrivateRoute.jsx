import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function PrivateRoute({ children, role }) {
    const { currentUser, userRole } = useAuth();

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    if (role) {
        const allowedRoles = Array.isArray(role) ? role : [role];
        if (!allowedRoles.includes(userRole)) {
            // If user has wrong role, redirect to their appropriate dashboard
            if (userRole === 'admin' || userRole === 'hod') return <Navigate to="/admin" />;
            if (userRole === 'student') return <Navigate to="/student" />;
            return <Navigate to="/" />;
        }
    }

    return children;
}
