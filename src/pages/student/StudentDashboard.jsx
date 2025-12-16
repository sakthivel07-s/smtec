import { Routes, Route } from "react-router-dom";
import Layout from "../../components/common/Layout";
import StudentOverview from "./StudentOverview";
import StudentResults from "./StudentResults";
import StudentSkills from "./StudentSkills";
import SmartResume from "./SmartResume";
import MockInterview from "./MockInterview";
import Leaderboard from "../../components/skills/Leaderboard";
import StudentProfile from "./StudentProfile";

export default function StudentDashboard() {
    return (
        <Layout title="Student Dashboard">
            <Routes>
                <Route path="/" element={<StudentOverview />} />
                <Route path="/results" element={<StudentResults />} />
                <Route path="/skills" element={<StudentSkills />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/resume" element={<SmartResume />} />
                <Route path="/interview" element={<MockInterview />} />
                <Route path="/profile" element={<StudentProfile />} />
            </Routes>
        </Layout>
    );
}
