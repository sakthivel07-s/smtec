import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { User, Mail, Phone, Link, Briefcase, Code, Award, Save, Loader2, CheckCircle, ExternalLink, Sparkles, X } from 'lucide-react';
import { enhanceProfessionalSummary } from '../../utils/aiService';

export default function StudentProfile() {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // AI State
    const [enhancingSummary, setEnhancingSummary] = useState(false);
    const [summarySuggestions, setSummarySuggestions] = useState(null);

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
        customSkills: ''
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
                customSkills: profileData.customSkills || ''
            }));
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnhanceSummary = async () => {
        if (!profile.about || profile.about.length < 10) return;
        setEnhancingSummary(true);
        try {
            const result = await enhanceProfessionalSummary(profile.about);
            setSummarySuggestions(result);
        } catch (error) {
            console.error(error);
        } finally {
            setEnhancingSummary(false);
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
            // Save ONLY editable fields to 'student_profiles' collection
            // ID same as currentUser.uid for 1-to-1 mapping
            const profileRef = doc(db, "student_profiles", currentUser.uid);

            await setDoc(profileRef, {
                regNo: profile.regNo, // Keep regNo for reference/searching
                name: profile.name,   // Keep name for reference
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

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Link size={18} className="text-blue-500" /> Social Links
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">LinkedIn URL</label>
                                <input
                                    name="linkedin"
                                    value={profile.linkedin}
                                    onChange={handleChange}
                                    placeholder="https://linkedin.com/in/..."
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">GitHub URL</label>
                                <input
                                    name="github"
                                    value={profile.github}
                                    onChange={handleChange}
                                    placeholder="https://github.com/..."
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Portfolio URL</label>
                                <input
                                    name="portfolio"
                                    value={profile.portfolio}
                                    onChange={handleChange}
                                    placeholder="https://myportfolio.com"
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm dark:text-white"
                                />
                            </div>
                        </div>
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
                </div>
            </div>
        </div>
    );
}
