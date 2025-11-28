import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import StudentDashboard from "./pages/student/StudentDashboard";
import PrivateRoute from "./components/PrivateRoute";
import BatchManagement from './pages/admin/BatchManagement';
import AlumniPage from './pages/admin/AlumniPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/admin/*" element={
            <PrivateRoute role={['admin', 'hod']}>
              <AdminDashboard />
            </PrivateRoute>
          } />

          <Route path="/student/*" element={
            <PrivateRoute role="student">
              <StudentDashboard />
            </PrivateRoute>
          } />

          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
