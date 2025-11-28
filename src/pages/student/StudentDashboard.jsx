import { Routes, Route } from "react-router-dom";
import Layout from "../../components/common/Layout";
import StudentOverview from "./StudentOverview";
import StudentResults from "./StudentResults";
import StudentSkills from "./StudentSkills";
import Leaderboard from "../../components/skills/Leaderboard";

export default function StudentDashboard() {
    return (
        <Layout title="Student Dashboard">
            <Routes>
                <Route path="/" element={<StudentOverview />} />
                <Route path="/results" element={<StudentResults />} />
                <Route path="/skills" element={<StudentSkills />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
            </Routes>
        </Layout>
    );
}
