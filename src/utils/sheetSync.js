import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function deleteStudentFromSheet(regNo) {
    try {
        // 1. Get Config
        const docRef = doc(db, "config", "googleSheet");
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) return; // No sync configured

        const { url } = docSnap.data();
        if (!url || !url.includes("script.google.com")) return;

        // 2. Call API
        // Use GET for delete to avoid CORS preflight issues with simple requests, or POST if needed.
        // GAS handles both doGet and doPost.
        await fetch(`${url}?action=delete&regNo=${regNo}&t=${Date.now()}`, {
            method: 'POST', // Using POST to be safe, but GET works too since we modified doGet
        });

        console.log(`Synced delete to sheet: ${regNo}`);
    } catch (error) {
        console.error("Error syncing delete to sheet:", error);
    }
}
