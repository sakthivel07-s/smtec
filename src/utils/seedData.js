import { doc, setDoc, writeBatch, collection } from "firebase/firestore";
import { db, auth } from "../config/firebase.js";
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from "firebase/auth";

const departments = ["CSE", "ECE", "MECH", "CIVIL", "EEE"];

const students = [
    { name: "John Doe", email: "john@smtec.edu", dept: "CSE", year: 3, cgpa: 8.5, regNo: "91001" },
    { name: "Jane Smith", email: "jane@smtec.edu", dept: "ECE", year: 2, cgpa: 9.0, regNo: "91002" },
    { name: "Mike Johnson", email: "mike@smtec.edu", dept: "MECH", year: 4, cgpa: 7.8, regNo: "91003" },
    { name: "Sarah Williams", email: "sarah@smtec.edu", dept: "CIVIL", year: 1, cgpa: 8.2, regNo: "91004" },
    { name: "David Brown", email: "david@smtec.edu", dept: "EEE", year: 3, cgpa: 8.0, regNo: "91005" },
    { name: "Emily Davis", email: "emily@smtec.edu", dept: "CSE", year: 2, cgpa: 9.2, regNo: "91006" },
    { name: "Michael Wilson", email: "michael@smtec.edu", dept: "ECE", year: 4, cgpa: 7.5, regNo: "91007" },
    { name: "Jessica Taylor", email: "jessica@smtec.edu", dept: "MECH", year: 1, cgpa: 8.8, regNo: "91008" },
    { name: "Christopher Anderson", email: "chris@smtec.edu", dept: "CIVIL", year: 3, cgpa: 7.9, regNo: "91009" },
    { name: "Amanda Thomas", email: "amanda@smtec.edu", dept: "EEE", year: 2, cgpa: 8.4, regNo: "91010" },
    { name: "Robert Martinez", email: "robert@smtec.edu", dept: "CSE", year: 4, cgpa: 8.1, regNo: "91011" },
    { name: "Jennifer Hernandez", email: "jennifer@smtec.edu", dept: "ECE", year: 1, cgpa: 9.1, regNo: "91012" },
    { name: "William White", email: "william@smtec.edu", dept: "MECH", year: 3, cgpa: 7.6, regNo: "91013" },
    { name: "Elizabeth Lopez", email: "elizabeth@smtec.edu", dept: "CIVIL", year: 2, cgpa: 8.3, regNo: "91014" },
    { name: "Daniel Gonzalez", email: "daniel@smtec.edu", dept: "EEE", year: 4, cgpa: 7.7, regNo: "91015" },
    { name: "Matthew Young", email: "matthew@smtec.edu", dept: "CSE", year: 1, cgpa: 8.9, regNo: "91016" },
    { name: "Ashley King", email: "ashley@smtec.edu", dept: "ECE", year: 3, cgpa: 8.6, regNo: "91017" },
    { name: "Joshua Scott", email: "joshua@smtec.edu", dept: "MECH", year: 2, cgpa: 7.4, regNo: "91018" },
    { name: "Andrew Green", email: "andrew@smtec.edu", dept: "CIVIL", year: 4, cgpa: 8.0, regNo: "91019" },
    { name: "Joseph Baker", email: "joseph@smtec.edu", dept: "EEE", year: 1, cgpa: 8.7, regNo: "91020" }
];

export async function seedDatabase() {
    const batch = writeBatch(db);

    students.forEach((student) => {
        // Use Register Number as Document ID
        const userRef = doc(db, "users", student.regNo);
        batch.set(userRef, {
            ...student,
            role: "student",
            createdAt: new Date().toISOString()
        });
    });

    // Create an Admin user doc
    const adminRef = doc(db, "users", "admin@smtec.edu");
    batch.set(adminRef, {
        name: "Admin User",
        email: "admin@smtec.edu",
        role: "admin",
        dept: "Administration",
        createdAt: new Date().toISOString()
    });

    await batch.commit();
    console.log("Database seeded with student data!");
    if (typeof window !== 'undefined') {
        alert("Database seeded! Please ensure you have created Authentication users for 'admin@smtec.edu' and students if you want to log in as them.");
    }
}

// Allow running directly from CLI
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    import('url').then(({ fileURLToPath }) => {
        if (process.argv[1] === fileURLToPath(import.meta.url)) {
            seedDatabase()
                .then(() => {
                    console.log("Seeding complete.");
                    process.exit(0);
                })
                .catch(e => {
                    console.error("Error seeding database:", e);
                    process.exit(1);
                });
        }
    }).catch(err => {
        // Ignore errors if url module is not found (shouldn't happen in Node)
    });
}
