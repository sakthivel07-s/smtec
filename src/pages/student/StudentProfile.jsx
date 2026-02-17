import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User, Mail, Phone, Link, Briefcase, Code, Award, Save, Loader2, CheckCircle, ExternalLink, Sparkles, X, Github, RefreshCw, Zap, Linkedin, Globe, MessageSquare, Target } from 'lucide-react';
import { enhanceProfessionalSummary, evaluateProfessionalPresence } from '../../utils/aiService';

export default function StudentProfile() {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    
    // AI State
    const [enhancingSummary, setEnhancingSummary] = useState(false);
    const [summarySuggestions, setSummarySuggestions] = useState(null);
    const [analyzingGithub, setAnalyzingGithub] = useState(false);
    const [retryStatus, setRetryStatus] = useState('');

    // Profile State
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        regNo: '',
        dept: '',
        year: '',
        phone: '',
        linkedin: '',
        portfolio: '',
        github: '',
        bio: '',
        about: '', // Summary
        experience: '', // Stored as text for now, can be structured later
        projects: '',
        certifications: '',
        customSkills: '',
        linkedinActivity: '', // For deep LinkedIn analysis
        portfolioDetails: '', // For deep Portfolio analysis
        professionalAnalysis: null, // Stores Integrated PQ Analysis
        psPortalData: [],
        otherSkillsData: []
    });

    useEffect(() => {
        fetchProfile();
    }, [currentUser]);

    const fetchProfile = async () => {
        if (!currentUser?.uid) return;
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

            setProfile(prev => ({
                ...prev,
                // Read-only fields from 'users'
                name: userData.name || '',
                email: userData.email || '',
                regNo: userData.regNo || '',
                dept: userData.dept || '',
                year: userData.year || '',
                psPortalData: userData.psPortalData || [],
                otherSkillsData: userData.otherSkillsData || [],

                // Editable fields from 'student_profiles' (with fallbacks)
                phone: profileData.phone || '',
                linkedin: profileData.linkedin || '',
                portfolio: profileData.portfolio || '',
                github: profileData.github || '',
                bio: profileData.bio || '',
                about: profileData.about || '',
                experience: profileData.experience || '',
                projects: profileData.projects || '',
                certifications: profileData.certifications || '',
                customSkills: profileData.customSkills || '',
                linkedinActivity: profileData.linkedinActivity || '',
                portfolioDetails: profileData.portfolioDetails || '',
                professionalAnalysis: profileData.professionalAnalysis || null
            }));
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleTotalProfessionalSync = async () => {
        if (!profile.github && !profile.linkedin && !profile.portfolio) {
            setSuccessMsg("Please provide at least one professional link!");
            return;
        }

        setAnalyzingGithub(true);
        setRetryStatus('Initiating Deep Professional Audit...');
        try {
            let repos = [];
            let portfolioRawText = "";
            let repoReadmes = {};
            let codeProof = {};

            // 1. Deep GitHub & Code Audit
            if (profile.github) {
                const username = profile.github.split('/').pop().replace(/\/$/, '');
                setRetryStatus(`Scanning ${username}'s architecture...`);
                // Increase per_page to ensure we see all your top work
                const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`);
                if (response.ok) {
                    repos = await response.json();
                    
                    const topRepos = repos.filter(r => !r.fork).slice(0, 5); // Analyze top 5 instead of 3
                    for(const repo of topRepos) {
                        setRetryStatus(`Auditing logic: ${repo.name}...`);
                        try {
                            // Try multiple common branches for README
                            const branches = ['main', 'master', 'develop'];
                            for (const branch of branches) {
                                const readmeRes = await fetch(`https://raw.githubusercontent.com/${username}/${repo.name}/${branch}/README.md`);
                                if (readmeRes.ok) {
                                    repoReadmes[repo.name] = await readmeRes.text();
                                    break;
                                }
                            }

                            // Deep Audit: Target core logic files directly if tree fails
                            const treeRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/contents`);
                            if (treeRes.ok) {
                                const contents = await treeRes.json();
                                const coreFiles = contents.filter(f => 
                                    f.type === 'file' && 
                                    (f.name.match(/\.(js|jsx|ts|tsx|py|cpp|c|cs|go|rs|java|ipynb)$/))
                                ).slice(0, 5);

                                let repoCode = [];
                                for(const file of coreFiles) {
                                    const fileRes = await fetch(file.download_url);
                                    if(fileRes.ok) {
                                        const text = await fileRes.text();
                                        repoCode.push(`--- FILE: ${file.name} ---\n${text.substring(0, 2000)}`);
                                    }
                                }
                                if(repoCode.length > 0) codeProof[repo.name] = repoCode.join('\n\n');
                            }
                        } catch (e) { console.warn(`Audit skip: ${repo.name}`); }
                    }
                }
            }

            // 2. Portfolio Analysis
            if (profile.portfolio) {
                setRetryStatus('Analyzing Portfolio craftsmanship...');
                try {
                    const portResponse = await fetch(profile.portfolio.startsWith('http') ? profile.portfolio : `https://${profile.portfolio}`);
                    if (portResponse.ok) {
                        const html = await portResponse.text();
                        portfolioRawText = html.replace(/<[^>]*>?/gm, ' ').substring(0, 4000);
                    }
                } catch (e) { }
            }

            setRetryStatus('AI Expert is conducting high-precision evaluation...');
            // 3. AI Multi-Source Deep Evaluation
            const analysis = await evaluateProfessionalPresence({
                github: { url: profile.github },
                linkedin: { url: profile.linkedin, activity: profile.linkedinActivity || "Daily technical updates and industry challenges." }, // Defaulting to active if blank
                portfolio: { url: profile.portfolio, extractedContent: portfolioRawText },
                repos,
                readmes: repoReadmes,
                codeProof: codeProof
            }, (status) => setRetryStatus(status));
            
            setProfile(prev => ({ ...prev, professionalAnalysis: analysis }));
            
            // SAVE 
            const profileRef = doc(db, "student_profiles", currentUser.uid);
            await setDoc(profileRef, {
                professionalAnalysis: analysis,
                github: profile.github,
                linkedin: profile.linkedin,
                portfolio: profile.portfolio,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            setSuccessMsg(`Evaluation Complete! Rank: ${analysis.verdict}`);
            setTimeout(() => setSuccessMsg(''), 3000);
            
        } catch (error) {
            console.error("Deep Audit Error:", error);
            setSuccessMsg("System overload. Please re-sync in 10 seconds.");
        } finally {
            setAnalyzingGithub(false);
            setRetryStatus('');
        }
    };

    const handleEnhanceSummary = async () => {
        if (!profile.about || profile.about.length < 10) return;
        setEnhancingSummary(true);
        setRetryStatus('Optimizing Summary...');
        try {
            const result = await enhanceProfessionalSummary(profile.about, (status) => setRetryStatus(status));
            setSummarySuggestions(result);
        } catch (error) {
            console.error(error);
            setSuccessMsg("AI Optimization failed. Please try again later.");
        } finally {
            setEnhancingSummary(false);
            setRetryStatus('');
        }
    };

    const applySuggestion = (text) => {
        setProfile(prev => ({ ...prev, about: text }));
        setSummarySuggestions(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccessMsg('');
        try {
            const profileRef = doc(db, "student_profiles", currentUser.uid);

            await setDoc(profileRef, {
                regNo: profile.regNo,
                name: profile.name,
                dept: profile.dept,
                year: profile.year,
                phone: profile.phone,
                linkedin: profile.linkedin,
                portfolio: profile.portfolio,
                github: profile.github,
                bio: profile.bio,
                about: profile.about,
                experience: profile.experience,
                projects: profile.projects,
                certifications: profile.certifications,
                customSkills: profile.customSkills,
                linkedinActivity: profile.linkedinActivity,
                portfolioDetails: profile.portfolioDetails,
                professionalAnalysis: profile.professionalAnalysis,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            setSuccessMsg('Profile saved to cloud successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) {
            console.error("Error saving profile:", error);
            setSuccessMsg('Error saving profile. Try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 font-sans">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage your professional identity and portfolio</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all"
                >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Save Changes
                </button>
            </div>

            {successMsg && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-4 rounded-xl flex items-center gap-2 border border-green-200 dark:border-green-800 animate-fade-in">
                    <CheckCircle size={20} /> {successMsg}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Col: Basic Info */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
                                {profile.name.charAt(0)}
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile.name}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{profile.regNo}</p>
                            <span className="mt-2 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full font-medium">
                                {profile.dept} • Year {profile.year}
                            </span>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">LinkedIn Profile</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                                        <Linkedin size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        name="linkedin"
                                        value={profile.linkedin}
                                        onChange={handleChange}
                                        placeholder="linkedin.com/in/..."
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Portfolio Website</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                                        <Globe size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        name="portfolio"
                                        value={profile.portfolio}
                                        onChange={handleChange}
                                        placeholder="yourportfolio.me"
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">GitHub Profile</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                                        <Github size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        name="github"
                                        value={profile.github}
                                        onChange={handleChange}
                                        placeholder="github.com/..."
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Short Bio / Headline</label>
                                <input
                                    name="bio"
                                    value={profile.bio}
                                    onChange={handleChange}
                                    placeholder="e.g. Aspiring Software Engineer"
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                                />
                            </div>
                            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 py-2">
                                    <Mail size={16} className="text-gray-400" />
                                    <span className="truncate">{profile.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 py-2">
                                    <Phone size={16} className="text-gray-400" />
                                    <input
                                        name="phone"
                                        value={profile.phone}
                                        onChange={handleChange}
                                        placeholder="Add Phone Number"
                                        className="bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-blue-500 outline-none w-full pb-1 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Sync & Analyze - NEW Integrated Platform sync */}
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100 dark:shadow-none">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight text-white">Multi-Platform AI Sync</h3>
                                <p className="text-xs text-indigo-100 italic">Syncing GitHub, LinkedIn & Portfolio</p>
                            </div>
                        </div>
                        
                        <p className="text-sm text-indigo-50 mb-6 leading-relaxed">
                            Our AI will analyze your repos, LinkedIn engagement highlights, and portfolio design to compute your **Professional Quotient (PQ)**.
                        </p>

                        <button 
                            onClick={handleTotalProfessionalSync}
                            disabled={analyzingGithub}
                            className="w-full py-3 bg-white text-indigo-600 font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-lg flex items-center justify-center gap-2 group disabled:opacity-70"
                        >
                            {analyzingGithub ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    <span className="animate-pulse">{retryStatus || 'Analyzing Digital Branding...'}</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                                    <span>Sync Professional Identity</span>
                                </>
                            )}
                        </button>
                        
                        {!profile.professionalAnalysis && !analyzingGithub && (
                            <p className="mt-3 text-[10px] text-center text-indigo-200 uppercase tracking-widest font-bold">
                                Initial analysis required
                            </p>
                        )}
                        
                        {profile.professionalAnalysis && !analyzingGithub && (
                            <div className="mt-4 pt-4 border-t border-white/20 space-y-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Archetype</p>
                                        <p className="text-lg font-black">{profile.professionalAnalysis.verdict}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">PQ Score</p>
                                        <p className="text-3xl font-black">{profile.professionalAnalysis.pqScore}</p>
                                    </div>
                                </div>
                                
                                <div className="w-full bg-white/20 rounded-full h-1.5">
                                    <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${profile.professionalAnalysis.pqScore}%` }}></div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 py-2">
                                    <div className="text-center p-2 bg-white/10 rounded-xl">
                                        <p className="text-[9px] uppercase opacity-60">GitHub</p>
                                        <p className="font-bold text-sm">{profile.professionalAnalysis.githubAnalysis?.score || 0}</p>
                                    </div>
                                    <div className="text-center p-2 bg-white/10 rounded-xl">
                                        <p className="text-[9px] uppercase opacity-60">LinkedIn</p>
                                        <p className="font-bold text-sm">{profile.professionalAnalysis.linkedinAnalysis?.score || 0}</p>
                                    </div>
                                    <div className="text-center p-2 bg-white/10 rounded-xl">
                                        <p className="text-[9px] uppercase opacity-60">Portfolio</p>
                                        <p className="font-bold text-sm">{profile.professionalAnalysis.portfolioAnalysis?.score || 0}</p>
                                    </div>
                                </div>

                                <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-bold text-indigo-200 uppercase mb-1">Growth Steer</p>
                                    <p className="text-xs italic leading-tight">"{profile.professionalAnalysis.growthSteer}"</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Col: Details */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <User size={18} className="text-purple-500" /> Professional Summary
                            </h3>
                            <button
                                onClick={handleEnhanceSummary}
                                disabled={enhancingSummary || !profile.about || profile.about.length < 10}
                                className="text-xs flex items-center gap-1 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-3 py-1.5 rounded-full font-bold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {enhancingSummary ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                {enhancingSummary ? 'Enhancing...' : 'AI Enhance'}
                            </button>
                        </div>

                        <textarea
                            name="about"
                            value={profile.about}
                            onChange={handleChange}
                            placeholder="Write a short professional summary about yourself..."
                            className="w-full h-24 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm resize-none focus:ring-2 focus:ring-purple-500 transition-all dark:text-white mb-2"
                        />

                        {summarySuggestions && (
                            <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800 animate-fade-in relative">
                                <button
                                    onClick={() => setSummarySuggestions(null)}
                                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                                >
                                    <X size={14} />
                                </button>

                                <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Sparkles size={12} /> AI Feedback
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 italic mb-4">"{summarySuggestions.feedback}"</p>

                                <div className="space-y-3">
                                    {summarySuggestions.suggestions.map((suggestion, idx) => (
                                        <div key={idx} className="group flex gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-purple-100 dark:border-purple-900/30 hover:shadow-md hover:border-purple-300 transition-all cursor-pointer" onClick={() => applySuggestion(suggestion)}>
                                            <div className="mt-1">
                                                <div className="w-4 h-4 rounded-full border-2 border-purple-200 dark:border-purple-700 group-hover:border-purple-500 transition-colors"></div>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-800 dark:text-gray-200">{suggestion}</p>
                                                <span className="text-xs text-purple-500 font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to Apply</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Linkedin size={18} className="text-blue-600" /> LinkedIn Professional Activity
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">Summarize your LinkedIn presence (e.g. "Shared 3 technical posts this month, active in React groups, 20+ likes on recent project post").</p>
                        <textarea
                            name="linkedinActivity"
                            value={profile.linkedinActivity}
                            onChange={handleChange}
                            placeholder="Describe your posts, reposts, comments, and engagement level..."
                            className="w-full h-32 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                        />
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Globe size={18} className="text-purple-500" /> Portfolio Highlights
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">Call out specific technical features of your portfolio (e.g. "Three.js 3D landing page, perfectly optimized Lighthouse scores, custom CSS animations").</p>
                        <textarea
                            name="portfolioDetails"
                            value={profile.portfolioDetails}
                            onChange={handleChange}
                            placeholder="Highlight what makes your portfolio technically unique..."
                            className="w-full h-32 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm resize-none focus:ring-2 focus:ring-purple-500 transition-all dark:text-white"
                        />
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Briefcase size={18} className="text-orange-500" /> Experience
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">Paste or type your internships and work experiences.</p>
                        <textarea
                            name="experience"
                            value={profile.experience}
                            onChange={handleChange}
                            placeholder="• Software Intern at XYZ Corp (June 2024 - Aug 2024)..."
                            className="w-full h-32 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm resize-none focus:ring-2 focus:ring-orange-500 transition-all dark:text-white"
                        />
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Code size={18} className="text-green-500" /> Projects
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">Describe your key projects and tech stacks.</p>
                        <textarea
                            name="projects"
                            value={profile.projects}
                            onChange={handleChange}
                            placeholder="• E-Commerce App: Built using React and Firebase..."
                            className="w-full h-32 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm resize-none focus:ring-2 focus:ring-green-500 transition-all dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Award size={18} className="text-yellow-500" /> Certifications
                            </h3>
                            <textarea
                                name="certifications"
                                value={profile.certifications}
                                onChange={handleChange}
                                placeholder="• AWS Cloud Practitioner..."
                                className="w-full h-24 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm resize-none focus:ring-2 focus:ring-yellow-500 transition-all dark:text-white"
                            />
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Award size={18} className="text-pink-500" /> Additional Skills
                            </h3>
                            <textarea
                                name="customSkills"
                                value={profile.customSkills}
                                onChange={handleChange}
                                placeholder="Public Speaking, Leadership, Figma..."
                                className="w-full h-24 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm resize-none focus:ring-2 focus:ring-pink-500 transition-all dark:text-white"
                            />
                        </div>
                    </div>

                    {/* NEW: External Activity Scores from Sheet */}
                    {(profile.psPortalData.length > 0 || profile.otherSkillsData.length > 0) && (
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-8 animate-fade-in">
                            <div className="flex items-center gap-3">
                                <Target className="text-red-500" />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">External Performance Record</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {profile.psPortalData.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">PS Portal Milestones</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {profile.psPortalData.map((lvl, idx) => (
                                                <div key={idx} className="bg-red-50/50 dark:bg-red-900/10 p-3 rounded-2xl border border-red-50 dark:border-red-900/20 flex justify-between items-center group hover:bg-red-500 hover:border-red-500 transition-all duration-300">
                                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 group-hover:text-white">{lvl.label}</span>
                                                    <span className="text-sm font-black text-red-600 dark:text-red-400 group-hover:text-white">{lvl.points}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {profile.otherSkillsData.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">Verified Skill Points</h4>
                                        <div className="space-y-2">
                                            {profile.otherSkillsData.map((skill, idx) => (
                                                <div key={idx} className="bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-2xl border border-emerald-50 dark:border-emerald-900/20 flex justify-between items-center group hover:bg-emerald-500 hover:border-emerald-500 transition-all duration-300">
                                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 group-hover:text-white capitalize">{skill.name}</span>
                                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 group-hover:text-white">{skill.points} pts</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
