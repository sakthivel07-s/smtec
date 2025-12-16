import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { generateResumeContent, isAIConfigured } from '../../utils/aiService';
import { FileText, Download, Loader2, BrainCircuit, Target, ArrowRight, AlertTriangle, User, Briefcase, Code, Award, Link, Phone, Mail, FolderGit2 } from 'lucide-react';
import jsPDF from 'jspdf';

export default function SmartResume() {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [profile, setProfile] = useState(null);
    const [skills, setSkills] = useState([]);
    const [aiData, setAiData] = useState(null);
    const [error, setError] = useState('');

    // Resume Input State
    const [formData, setFormData] = useState({
        phone: '',
        linkedin: '',
        portfolio: '',
        github: '',
        experience: '',
        projects: '',
        certifications: '',
        customSkills: ''
    });

    useEffect(() => {
        fetchUserData();
    }, [currentUser]);

    const fetchUserData = async () => {
        if (!currentUser?.uid) return;
        setLoading(true);
        try {
            // 1. Fetch Read-Only Data from 'users'
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            let userData = {};
            if (userDoc.exists()) {
                userData = userDoc.data();
            }

            // 2. Fetch Editable Data from 'student_profiles'
            const profileDoc = await getDoc(doc(db, "student_profiles", currentUser.uid));
            let profileData = {};
            if (profileDoc.exists()) {
                profileData = profileDoc.data();
            }

            setProfile(userData);

            // Pre-fill profile data (Prioritize 'student_profiles')
            setFormData(prev => ({
                ...prev,
                phone: profileData.phone || userData.phone || '', // Fallback to user data if not in profile yet
                linkedin: profileData.linkedin || userData.linkedin || '',
                portfolio: profileData.portfolio || userData.portfolio || '',
                github: profileData.github || userData.github || '',
                experience: profileData.experience || userData.experience || '',
                projects: profileData.projects || userData.projects || '',
                certifications: profileData.certifications || userData.certifications || '',
                customSkills: profileData.customSkills || userData.customSkills || ''
            }));

            // Fetch Skills
            if (userData.regNo) {
                const regNo = String(userData.regNo);
                const skillsRef = collection(db, "student_skills");
                const skillsSnap = await getDocs(skillsRef);
                const mySkills = [];
                skillsSnap.forEach(doc => {
                    const sData = doc.data();
                    if (String(sData.regNo) === regNo) {
                        if (sData.skillName) mySkills.push({ skill: sData.skillName, level: sData.level || 'Intermediate' });
                    }
                });
                setSkills(mySkills);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load profile data.");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerate = async () => {
        if (!isAIConfigured()) {
            setError("AI Config Missing: Please add VITE_GEMINI_API_KEY to your .env file.");
            return;
        }

        setGenerating(true);
        setError('');
        try {
            // Include formData in the AI generation call
            const result = await generateResumeContent(profile, skills, formData);
            setAiData(result);
        } catch (err) {
            console.error(err);
            setError("AI Generation Failed. Please try again later.");
        } finally {
            setGenerating(false);
        }
    };

    const downloadPDF = () => {
        if (!aiData || !profile) return;
        const pdf = new jsPDF();

        let y = 20;
        const splitText = (text, maxWidth) => pdf.splitTextToSize(text, maxWidth);

        // --- HEADER ---
        pdf.setFontSize(22);
        pdf.setFont("helvetica", "bold");
        pdf.text(profile.name, 20, y);
        y += 8;

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const contactLine = [
            profile.email,
            formData.phone,
            formData.linkedin ? `LinkedIn: ${formData.linkedin}` : '',
            formData.portfolio ? `Portfolio: ${formData.portfolio}` : ''
        ].filter(Boolean).join(" | ");

        const contactLines = splitText(contactLine, 170);
        pdf.text(contactLines, 20, y);
        y += (contactLines.length * 5) + 6;

        pdf.text(`${profile.dept} | Year ${profile.year} | CGPA: ${profile.cgpa}`, 20, y);
        y += 10;

        pdf.setLineWidth(0.5);
        pdf.line(20, y, 190, y);
        y += 10;

        // --- SUMMARY ---
        if (aiData.summary) {
            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            pdf.text("PROFESSIONAL SUMMARY", 20, y);
            y += 6;
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            const summaryLines = splitText(aiData.summary, 170);
            pdf.text(summaryLines, 20, y);
            y += (summaryLines.length * 5) + 6;
        }

        // --- SKILLS ---
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("SKILLS", 20, y);
        y += 6;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");

        const allSkills = [
            ...aiData.topStrengths,
            ...skills.map(s => s.skill),
            ...(formData.customSkills ? formData.customSkills.split(',').map(s => s.trim()) : [])
        ];
        // Unique skills
        const uniqueSkills = [...new Set(allSkills)].join(" • ");
        const skillLines = splitText(uniqueSkills, 170);
        pdf.text(skillLines, 20, y);
        y += (skillLines.length * 5) + 6;

        // --- EXPERIENCE ---
        if (aiData.enhancedExperience && aiData.enhancedExperience.length > 0) {
            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            pdf.text("EXPERIENCE", 20, y);
            y += 6;

            aiData.enhancedExperience.forEach(exp => {
                // Check page break
                if (y > 270) { pdf.addPage(); y = 20; }

                pdf.setFontSize(11);
                pdf.setFont("helvetica", "bold");
                pdf.text(`${exp.role} | ${exp.company}`, 20, y);

                pdf.setFontSize(10);
                pdf.setFont("helvetica", "italic");
                const durationWidth = pdf.getStringUnitWidth(exp.duration) * 10 / pdf.internal.scaleFactor;
                pdf.text(exp.duration, 190 - durationWidth, y);
                y += 5;

                pdf.setFont("helvetica", "normal");
                exp.points.forEach(point => {
                    const bulletLines = splitText(`• ${point}`, 165);
                    pdf.text(bulletLines, 25, y);
                    y += (bulletLines.length * 5);
                });
                y += 4;
            });
            y += 2;
        }

        // --- PROJECTS ---
        if (aiData.enhancedProjects && aiData.enhancedProjects.length > 0) {
            if (y > 270) { pdf.addPage(); y = 20; }
            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            pdf.text("PROJECTS", 20, y);
            y += 6;

            aiData.enhancedProjects.forEach(proj => {
                if (y > 270) { pdf.addPage(); y = 20; }

                // Project Title
                pdf.setFontSize(11);
                pdf.setFont("helvetica", "bold");
                pdf.text(proj.title, 20, y);
                y += 5;

                // Tech Stack (New Line)
                if (proj.techStack) {
                    pdf.setFontSize(10);
                    pdf.setFont("helvetica", "italic");
                    pdf.setTextColor(80); // Dark Gray
                    // Wrap tech stack if it's too long
                    const techLines = splitText(`Tech Stack: ${proj.techStack}`, 170);
                    pdf.text(techLines, 20, y);
                    pdf.setTextColor(0); // Reset to Black
                    y += (techLines.length * 5);
                }

                pdf.setFontSize(10);
                pdf.setFont("helvetica", "normal");
                proj.points.forEach(point => {
                    const bulletLines = splitText(`• ${point}`, 165);
                    pdf.text(bulletLines, 25, y);
                    y += (bulletLines.length * 5);
                });
                y += 4;
            });
            y += 2;
        }

        // --- CERTIFICATIONS ---
        if (formData.certifications) {
            if (y > 270) { pdf.addPage(); y = 20; }
            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            pdf.text("CERTIFICATIONS & AWARDS", 20, y);
            y += 6;
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");

            // Just split by newlines if manually entered, or bullets
            const certLines = splitText(formData.certifications, 170);
            pdf.text(certLines, 20, y);
        }

        pdf.save(`${profile.name}_Resume.pdf`);
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-fade-in font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                        <BrainCircuit className="text-purple-500" size={32} />
                        Smart Resume Builder
                    </h1>
                    <p className="text-gray-500 mt-1">Enhance your profile with extra details and let AI assist you.</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 border border-red-100 dark:border-red-800">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-col-3 gap-8">
                {/* --- LEFT: INPUT FORM --- */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <User size={18} className="text-blue-500" /> Complete Your Profile
                        </h2>

                        <div className="space-y-4">
                            {/* Contact Links */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact & Links</label>
                                <div className="relative">
                                    <Phone size={14} className="absolute left-3 top-3 text-gray-400" />
                                    <input name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleInputChange} className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm" />
                                </div>
                                <div className="relative">
                                    <Link size={14} className="absolute left-3 top-3 text-gray-400" />
                                    <input name="linkedin" placeholder="LinkedIn URL" value={formData.linkedin} onChange={handleInputChange} className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm" />
                                </div>
                                <div className="relative">
                                    <FolderGit2 size={14} className="absolute left-3 top-3 text-gray-400" />
                                    <input name="portfolio" placeholder="Portfolio / GitHub URL" value={formData.portfolio} onChange={handleInputChange} className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm" />
                                </div>
                            </div>

                            {/* Skills */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Skills</label>
                                <textarea name="customSkills" placeholder="E.g. Docker, Figma, Public Speaking (comma separated)" value={formData.customSkills} onChange={handleInputChange} className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm h-20 resize-none" />
                            </div>

                            {/* Experience */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                    <Briefcase size={14} /> Experience
                                </label>
                                <textarea name="experience" placeholder="Paste your internships or work experience details here..." value={formData.experience} onChange={handleInputChange} className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm h-24 resize-none" />
                            </div>

                            {/* Projects */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                    <Code size={14} /> Projects
                                </label>
                                <textarea name="projects" placeholder="Describe your key projects, tech stack used..." value={formData.projects} onChange={handleInputChange} className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm h-24 resize-none" />
                            </div>

                            {/* Certifications */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                    <Award size={14} /> Certifications
                                </label>
                                <textarea name="certifications" placeholder="List your certifications..." value={formData.certifications} onChange={handleInputChange} className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm h-20 resize-none" />
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="w-full btn-primary flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 border-none shadow-lg shadow-purple-200 dark:shadow-none py-3 rounded-xl mt-4 text-white font-bold transition-transform active:scale-95"
                            >
                                {generating ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
                                {aiData ? "Regenerate Resume" : "Generate Resume"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT: PREVIEW --- */}
                <div className="lg:col-span-2 space-y-6">
                    {!aiData ? (
                        <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl h-full min-h-[500px] flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                            <FileText size={48} className="mb-4 opacity-50" />
                            <h3 className="text-lg font-bold text-gray-500">Resume Preview</h3>
                            <p className="max-w-md mt-2">Fill in your details on the left and click Generate. AI will structure your data into a professional resume.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                            {/* Resume Actions */}
                            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                                <h2 className="font-bold flex items-center gap-2 text-green-600">
                                    <FileText size={20} /> AI Refined Resume
                                </h2>
                                <button onClick={downloadPDF} className="btn-secondary text-sm flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800">
                                    <Download size={16} /> Download PDF
                                </button>
                            </div>

                            {/* Resume Content Visualizer */}
                            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-lg border border-gray-100 dark:border-gray-800">
                                {/* Header Preview */}
                                <div className="border-b pb-6 mb-6">
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">{profile?.name}</h1>
                                    <div className="text-sm text-gray-500 mt-2 flex flex-wrap gap-3">
                                        <span>{profile?.email}</span>
                                        {formData.phone && <span>• {formData.phone}</span>}
                                        {formData.linkedin && <span>• {formData.linkedin}</span>}
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="mb-6">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Summary</h3>
                                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">{aiData.summary}</p>
                                </div>

                                {/* Experience */}
                                {aiData.enhancedExperience && (
                                    <div className="mb-6">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Experience</h3>
                                        <div className="space-y-4">
                                            {aiData.enhancedExperience.map((exp, i) => (
                                                <div key={i}>
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <h4 className="font-bold text-gray-900 dark:text-white">{exp.role}</h4>
                                                        <span className="text-xs text-gray-500 font-mono">{exp.duration}</span>
                                                    </div>
                                                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-1">{exp.company}</p>
                                                    <ul className="list-disc list-outside ml-4 space-y-1">
                                                        {exp.points.map((pt, j) => (
                                                            <li key={j} className="text-sm text-gray-600 dark:text-gray-400">{pt}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Projects */}
                                {aiData.enhancedProjects && (
                                    <div className="mb-6">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Projects</h3>
                                        <div className="space-y-4">
                                            {aiData.enhancedProjects.map((proj, i) => (
                                                <div key={i}>
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <h4 className="font-bold text-gray-900 dark:text-white">{proj.title}</h4>
                                                        {proj.techStack && <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500">{proj.techStack}</span>}
                                                    </div>
                                                    <ul className="list-disc list-outside ml-4 space-y-1">
                                                        {proj.points.map((pt, j) => (
                                                            <li key={j} className="text-sm text-gray-600 dark:text-gray-400">{pt}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Analysis Section (Roadmap) */}
                            <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                                    <Target className="text-purple-400" /> AI Career Roadmap & Feedback
                                </h2>
                                <div className="space-y-4">
                                    {aiData.roadmap.map((step, i) => (
                                        <div key={i} className="flex gap-4">
                                            <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs font-bold border border-purple-500/30 flex-shrink-0">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm text-white">{step.step}</h3>
                                                <p className="text-xs text-gray-300 mt-1">{step.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
