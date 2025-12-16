import { useState, useEffect, useRef } from 'react';
import { doc, writeBatch, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { RefreshCw, Link, CheckCircle, Trash2, ToggleLeft, ToggleRight, UploadCloud, DownloadCloud } from 'lucide-react';

export default function GoogleSheetSync({ onSyncSuccess }) {
    const [url, setUrl] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [autoSync, setAutoSync] = useState(false);
    const [message, setMessage] = useState('');
    const [lastSyncTime, setLastSyncTime] = useState(null);

    const autoSyncInterval = useRef(null);

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
                // Run Pull first
                await handlePullSync(true);
                // Then Run Push
                await handlePushSync(true);
            };

            runAutoSync(); // Run immediately
            autoSyncInterval.current = setInterval(runAutoSync, 5000);
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
            const contentType = response.headers.get("content-type");

            if (contentType && contentType.includes("text/html")) {
                throw new Error("Received HTML. Check 'Who has access' is set to 'Anyone'.");
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

            // 2. Fetch Firestore Data
            const querySnapshot = await getDocs(collection(db, "users"));
            const dbStudents = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.role === 'student') {
                    dbStudents.push({ id: doc.id, ...data });
                }
            });

            // 3. Sync Logic
            const batch = writeBatch(db);
            let changes = 0;
            const sheetRegNos = new Set(sheetStudents.map(s => String(s.regNo)));

            // A. Update/Create from Sheet -> DB
            sheetStudents.forEach(s => {
                if (!s.regNo) return;
                const docRef = doc(db, "users", String(s.regNo));
                const data = {
                    ...s,
                    role: 'student',
                    updatedAt: new Date().toISOString()
                };
                // We use setDoc with merge to avoid overwriting existing fields not in sheet
                batch.set(docRef, data, { merge: true });
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
                    <div className="flex justify-between items-center p-3 bg-secondary-light rounded-md flex-col-mobile gap-3">
                        <div className="flex items-center gap-2">
                            <button onClick={toggleAutoSync} className="flex items-center gap-2 text-primary font-medium">
                                {autoSync ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                Auto-Sync (Pull & Push)
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
                <p className={`mt-2 text-sm ${message.includes("Error") ? "text-error" : "text-success"}`}>
                    {message}
                </p>
            )}
        </div>
    );
}
