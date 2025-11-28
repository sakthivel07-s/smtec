import { useState } from 'react';
import * as XLSX from 'xlsx';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from "../../contexts/AuthContext";

export default function ExcelUpload({ onUploadSuccess }) {
    const { userDept } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setMessage('');

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    throw new Error("No data found in sheet");
                }

                const batch = writeBatch(db);
                let count = 0;

                data.forEach((student) => {
                    // Use regNo as the unique identifier
                    if (student.regNo) {
                        // Ensure regNo is a string
                        const regNo = String(student.regNo);
                        const userRef = doc(db, "users", regNo);

                        const studentData = {
                            ...student,
                            regNo: regNo,
                            role: "student",
                            updatedAt: new Date().toISOString()
                        };

                        // Enforce HOD Department
                        if (userDept) {
                            studentData.dept = userDept;
                            studentData.department = userDept;
                        }

                        batch.set(userRef, studentData, { merge: true });
                        count++;
                    }
                });

                await batch.commit();
                setMessage(`Successfully uploaded ${count} students!`);
                if (onUploadSuccess) onUploadSuccess();
            } catch (error) {
                console.error("Error uploading excel:", error);
                setMessage("Error uploading file: " + error.message);
            } finally {
                setUploading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="card mt-4">
            <h3>Upload Student Data (Excel)</h3>
            <p className="text-sm text-secondary mb-4">Upload an .xlsx file with columns: <strong>regNo</strong>, name, email, dept, year, cgpa</p>
            <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ padding: '1rem', border: '2px dashed #ccc', width: '100%', borderRadius: 'var(--radius-md)' }}
            />
            {uploading && <p>Uploading...</p>}
            {message && <p className={message.includes("Error") ? "text-error" : "text-success"}>{message}</p>}
        </div>
    );
}
