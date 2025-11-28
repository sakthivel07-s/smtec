import { Routes, Route } from "react-router-dom";
import Layout from "../../components/common/Layout";
import DashboardHome from "./DashboardHome";
import StudentsPage from "./StudentsPage";
import UploadPage from "./UploadPage";
import SkillManagement from "./SkillManagement";
import BatchManagement from "./BatchManagement";
import AlumniPage from "./AlumniPage";
import Leaderboard from "../../components/skills/Leaderboard";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminDashboard() {
    const { userDept } = useAuth();
    return (
        <Layout title={userDept ? `${userDept} Dashboard` : "Admin Dashboard"}>
            <Routes>
                <Route path="/" element={<DashboardHome />} />
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/skills" element={<SkillManagement />} />
                <Route path="/batches" element={<BatchManagement />} />
                <Route path="/alumni" element={<AlumniPage />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
            </Routes>
        </Layout>
    );
}
