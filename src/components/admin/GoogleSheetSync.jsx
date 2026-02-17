import { useState, useEffect, useRef } from 'react';
import { doc, writeBatch, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { RefreshCw, Link, CheckCircle, Trash2, ToggleLeft, ToggleRight, UploadCloud, DownloadCloud } from 'lucide-react';

export default function GoogleSheetSync({ onSyncSuccess }) {
    const [url, setUrl] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [autoSync, setAutoSync] = useState(true);
    const [message, setMessage] = useState('');
    const [lastSyncTime, setLastSyncTime] = useState(null);

    const autoSyncInterval = useRef(null);
    const idMapRef = useRef({}); // Cache: RegNo -> DocID

    useEffect(() => {
        async function loadConfig() {
            try {
                const docRef = doc(db, "config", "googleSheet");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.url) {
                        setUrl(data.url);
                        setIsConnected(true);

                        // Check if it's the old CSV link and warn user
                        if (!data.url.includes("script.google.com")) {
                            setMessage("Update Required: Please Disconnect and add the new 'Web App URL' for Two-Way Sync.");
                        } else if (data.autoSync) {
                            setAutoSync(true);
                        }
                    }
                }
            } catch (error) {
                console.error("Error loading config:", error);
            }
        }
        loadConfig();
    }, []);

    useEffect(() => {
        if (autoSync && isConnected && url) {
            const runAutoSync = async () => {
                await handlePullSync(true);
            };

            runAutoSync(); 
            // Slow down sync to 5 minutes to stay within Firebase Daily Free Quota
            autoSyncInterval.current = setInterval(runAutoSync, 300000); 
        } else {
            if (autoSyncInterval.current) clearInterval(autoSyncInterval.current);
        }
        return () => {
            if (autoSyncInterval.current) clearInterval(autoSyncInterval.current);
        };
    }, [autoSync, isConnected, url]);

    const saveConfig = async (validUrl) => {
        try {
            await setDoc(doc(db, "config", "googleSheet"), {
                url: validUrl,
                updatedAt: new Date().toISOString(),
                autoSync: autoSync
            });
            setIsConnected(true);
            setMessage("Connected! Link saved.");
        } catch (error) {
            console.error("Error saving config:", error);
        }
    };

    const handleDisconnect = async () => {
        try {
            await deleteDoc(doc(db, "config", "googleSheet"));
            setUrl('');
            setIsConnected(false);
            setAutoSync(false);
            setMessage("Disconnected.");
        } catch (error) {
            console.error("Error disconnecting:", error);
        }
    };

    const toggleAutoSync = async () => {
        const newState = !autoSync;
        setAutoSync(newState);
        if (isConnected) {
            await setDoc(doc(db, "config", "googleSheet"), { autoSync: newState }, { merge: true });
        }
    };

    // PULL: Sheet -> Website
    const handlePullSync = async (isAuto = false) => {
        if (!url) return;
        if (!url.includes("script.google.com")) {
            if (!isAuto) setMessage("Error: Please use the 'Web App URL' (starts with script.google.com)");
            return;
        }

        setSyncing(true);
        if (!isAuto) setMessage('Syncing...');

        try {
            // 1. Fetch Sheet Data
            const fetchUrl = `${url}?action=read&t=${new Date().getTime()}`;
            const response = await fetch(fetchUrl);
            
            if (response.status === 403) {
                throw new Error("Access Denied (403). Ensure 'Who has access' is set to 'Anyone' in Apps Script Deployment.");
            }

            const contentType = response.headers.get("content-type");

            if (contentType && contentType.includes("text/html")) {
                throw new Error("Received HTML instead of JSON. Please re-deploy the script as 'Anyone'.");
            }

            const result = await response.json();

            if (result.status === 'error') throw new Error(result.message);

            // If we reached here, the connection is valid!
            if (!isConnected) {
                await saveConfig(url);
            }

            const sheetStudents = result.data || [];

            if (sheetStudents.length === 0) {
                if (!isAuto) setMessage("Connected! Sheet is empty. Use 'Push to Sheet' to fill it.");
                return;
            }

            // 2. Optimized Matching (Use Cache)
            const dbStudents = [];
            
            // Only fetch all users if our map is empty (saves thousands of reads)
            if (Object.keys(idMapRef.current).length === 0) {
                const querySnapshot = await getDocs(collection(db, "users"));
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.regNo) {
                        const reg = String(data.regNo).trim();
                        idMapRef.current[reg] = doc.id;
                        dbStudents.push({ id: doc.id, regNo: reg, ...data });
                    }
                });
            } else {
                // If using cache, still need to build dbStudents array for delete logic
                const querySnapshot = await getDocs(collection(db, "users"));
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.regNo) {
                        dbStudents.push({ id: doc.id, regNo: String(data.regNo).trim(), ...data });
                    }
                });
            }

            // 3. Sync Logic
            const batch = writeBatch(db);
            let changes = 0;
            const sheetRegNos = new Set(sheetStudents.map(s => String(s.regNo).trim()));

            // A. Update/Create from Sheet -> DB
            sheetStudents.forEach(s => {
                const regNo = String(s.regNo || "").trim();
                if (!regNo) return;

                // CRITICAL: Find existing student ID or fallback to RegNo as ID
                const docId = idMapRef.current[regNo] || regNo;
                const docRef = doc(db, "users", docId);
                
                // Flexible parsing: Find fields by various potential keys (case-insensitive)
                const getField = (searchTerms) => {
                    const sKeys = Object.keys(s);
                    for (const term of searchTerms) {
                        const match = sKeys.find(k => k.toLowerCase().replace(/[-_ ]/g, '') === term.toLowerCase().replace(/[-_ ]/g, ''));
                        if (match && s[match] !== undefined && s[match] !== "") return s[match];
                    }
                    return null;
                };

                const psPortalRaw = getField(['psPortal', 'PSPortalMarks', 'PSPortal']);
                const otherSkillsRaw = getField(['otherSkills', 'OtherActivitiesMarks', 'OtherActivities']);

                const parsedData = {
                    ...s,
                    role: 'student',
                    updatedAt: new Date().toISOString()
                };

                // Normalize Dept (e.g., "IV CSE B" -> "CSE")
                const knownDepts = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "AI&DS", "IT"];
                const currentDept = String(s.dept || s.Dept || "").toUpperCase();
                const matchedDept = knownDepts.find(d => currentDept.includes(d));
                if (matchedDept) {
                    parsedData.dept = matchedDept;
                } else if (s.dept) {
                    parsedData.dept = s.dept; // Keep original if no match
                }

                // Normalize Year (Ensure it's a number)
                parsedData.year = Number(s.year || s.Year || 1);

                // Parse PS Portal
                if (psPortalRaw) {
                    const levels = String(psPortalRaw).split(',').map(v => v.trim()).filter(v => v);
                    parsedData.psPortalData = levels.map((val, idx) => ({
                        label: `Level ${idx + 1}`,
                        points: val
                    }));
                } else {
                    parsedData.psPortalData = []; // Clear if empty in sheet
                }

                // Parse Other Skills
                if (otherSkillsRaw) {
                    const skillPairs = String(otherSkillsRaw).split(',').map(v => v.trim()).filter(v => v);
                    parsedData.otherSkillsData = skillPairs.map(pair => {
                        if (pair.includes('=')) {
                            const [name, score] = pair.split('=').map(v => v.trim());
                            return { name: name || "Unknown", points: score || "0" };
                        }
                        const parts = pair.split(/\s+/);
                        const score = parts.pop();
                        const name = parts.join(' ');
                        return { name: name || pair, points: score || "0" };
                    }).filter(p => p.name && p.name !== "Unknown");
                } else {
                    parsedData.otherSkillsData = []; // Clear if empty in sheet
                }

                batch.set(docRef, parsedData, { merge: true });
                changes++;
            });

            // B. Delete from DB if not in Sheet (The "Two-Way Delete" requirement)
            dbStudents.forEach(dbS => {
                if (dbS.regNo && !sheetRegNos.has(String(dbS.regNo))) {
                    const docRef = doc(db, "users", dbS.id);
                    batch.delete(docRef);
                    changes++;
                }
            });

            if (changes > 0) {
                await batch.commit();
                const msg = `Synced! Updated/Created: ${sheetStudents.length}, Deleted: ${dbStudents.length - sheetRegNos.size}`;
                if (!isAuto) setMessage(msg);
                setLastSyncTime(new Date().toLocaleTimeString());
            } else {
                if (!isAuto) setMessage("Already up to date.");
            }

        } catch (error) {
            console.error("Pull error:", error);
            if (!isAuto) setMessage("Sync Failed: " + error.message);
        } finally {
            setSyncing(false);
        }
    };

    // PUSH: Website -> Sheet
    const handlePushSync = async (isAuto = false) => {
        if (!url) return;

        if (!url.includes("script.google.com")) {
            if (!isAuto) setMessage("Error: Invalid URL. Please use 'Web App URL'.");
            return;
        }

        if (!isAuto) {
            setPushing(true);
            setMessage('Pushing data to Sheet...');
        }

        try {
            // Fetch all students from Firestore
            const querySnapshot = await getDocs(collection(db, "users"));
            const students = [];
            const studentMap = {};

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.role === 'student') {
                    const s = { ...data, skillPoints: 0 }; // Default 0
                    students.push(s);
                    if (data.regNo) studentMap[data.regNo] = s;
                }
            });

            if (students.length === 0) {
                if (!isAuto) throw new Error("No students found in database to push.");
                return;
            }

            // Fetch Skills to calculate points
            const skillsSnapshot = await getDocs(collection(db, "student_skills"));
            skillsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.regNo && studentMap[data.regNo]) {
                    studentMap[data.regNo].skillPoints += Number(data.points) || 0;
                }
            });

            // Send to Web App
            // Using text/plain to avoid CORS preflight (OPTIONS) requests which often fail with GAS
            const response = await fetch(`${url}?action=write&t=${new Date().getTime()}`, {
                method: 'POST',
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
                body: JSON.stringify({ students: students })
            });

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("text/html")) {
                throw new Error("Received HTML. Check 'Who has access' is set to 'Anyone'.");
            }

            const result = await response.json();
            if (result.status === 'error') throw new Error(result.message);

            if (!isAuto) setMessage(`Success! Pushed ${students.length} students to Sheet.`);

        } catch (error) {
            console.error("Push error:", error);
            if (!isAuto) setMessage("Push Error: " + error.message);
        } finally {
            if (!isAuto) setPushing(false);
        }
    };

    return (
        <div className="card mt-4">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <Link size={20} className="text-primary" />
                    <h3>Two-Way Google Sheet Sync</h3>
                    {isConnected && <span className="badge badge-success flex items-center gap-1"><CheckCircle size={12} /> Connected</span>}
                </div>
                {isConnected && (
                    <button onClick={handleDisconnect} className="text-error hover:text-red-700" title="Disconnect">
                        <Trash2 size={18} />
                    </button>
                )}
            </div>

            {!isConnected ? (
                <>
                    <div className="alert alert-info mb-4 text-sm">
                        <strong>Setup Required:</strong>
                        <ol className="list-decimal ml-4 mt-1">
                            <li>Copy the code from <code>src/utils/GoogleAppsScript.js</code></li>
                            <li>Go to your Google Sheet &gt; Extensions &gt; Apps Script</li>
                            <li>Paste the code and Deploy as <strong>Web App</strong> (Who has access: Anyone)</li>
                            <li>Paste the <strong>Web App URL</strong> below.</li>
                        </ol>
                    </div>
                    <div className="flex gap-2 flex-col-mobile">
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://script.google.com/macros/s/.../exec"
                            disabled={syncing}
                            className="input-field"
                            style={{ flex: 1 }}
                        />
                        <button
                            onClick={() => handlePullSync(false)}
                            className="btn-primary flex items-center justify-center gap-2"
                            disabled={syncing || !url}
                        >
                            {syncing ? <RefreshCw className="animate-spin" size={18} /> : 'Connect'}
                        </button>
                    </div>
                </>
            ) : (
                <div className="flex flex-col gap-4">
                    {/* NEW: Mark Formatting Guide */}
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                        <h4 className="text-[10px] font-black uppercase text-blue-500 mb-2 tracking-widest">Mark Entry Guide</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400">PS-Portal Marks</p>
                                <code className="text-[11px] text-blue-600">300, 250, 600</code>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400">Other Activities</p>
                                <code className="text-[11px] text-emerald-600 font-medium whitespace-nowrap">NPTEL=50, Sports=20</code>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-secondary-light rounded-xl flex-col-mobile gap-3">
                        <div className="flex items-center gap-4">
                            <button onClick={toggleAutoSync} className="flex items-center gap-2 text-primary font-medium">
                                {autoSync ? (
                                    <div className="flex items-center gap-2 text-emerald-600">
                                        <ToggleRight size={24} />
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Live Pull Active</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <ToggleLeft size={24} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Live Sync Off</span>
                                    </div>
                                )}
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePullSync(false)}
                                className="btn-secondary flex items-center gap-2"
                                disabled={syncing || pushing}
                                title="Pull data from Sheet to Website"
                            >
                                <DownloadCloud size={16} className={syncing ? "animate-spin" : ""} />
                                Pull from Sheet
                            </button>
                            <button
                                onClick={() => handlePushSync(false)}
                                className="btn-primary flex items-center gap-2"
                                disabled={syncing || pushing}
                                title="Push data from Website to Sheet"
                            >
                                <UploadCloud size={16} className={pushing ? "animate-spin" : ""} />
                                Push to Sheet
                            </button>
                        </div>
                    </div>

                    {lastSyncTime && (
                        <p className="text-xs text-muted text-right">
                            Last pulled: {lastSyncTime}
                        </p>
                    )}
                </div>
            )}

            {message && (
                <div className="mt-2 text-sm flex items-center justify-between">
                    <p className={message.includes("Error") || message.includes("Denied") ? "text-error" : "text-success"}>
                        {message}
                    </p>
                    {message.includes("Error") || message.includes("Failed") || message.includes("Denied") ? (
                        <a 
                            href={url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-[10px] font-bold uppercase text-blue-500 hover:underline"
                        >
                            Test Link in Tab
                        </a>
                    ) : null}
                </div>
            )}
        </div>
    );
}
