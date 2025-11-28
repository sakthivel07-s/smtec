import { collection, doc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";

const DEPARTMENTS = [
    { code: '104', name: 'CSE' },
    { code: '106', name: 'ECE' },
    { code: '105', name: 'EEE' },
    { code: '114', name: 'MECH' },
    { code: '103', name: 'CIVIL' },
    { code: '205', name: 'IT' },
    { code: '243', name: 'AI&DS' }
];

const NAMES = [
    "Aarav", "Vihaan", "Aditya", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Shaurya",
    "Ananya", "Diya", "Saanvi", "Aadhya", "Pari", "Kiara", "Myra", "Riya", "Anvi", "Aarya",
    "Rahul", "Priya", "Amit", "Sneha", "Rohit", "Neha", "Vikram", "Pooja", "Suresh", "Rani",
    "Karthik", "Deepa", "Manish", "Swati", "Sanjay", "Divya", "Varun", "Kavya", "Arun", "Meera"
];

const SKILL_ACTIVITIES = [
    "Hackathon Winner", "Paper Presentation", "Code Debugging", "Web Design Contest",
    "Technical Quiz", "Project Expo", "Sports Meet", "Cultural Event", "NSS Camp", "Workshop"
];

const generateRegNo = (yearCode, deptCode, serialNo) => {
    return `9530${yearCode}${deptCode}${String(serialNo).padStart(3, '0')}`;
};

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const seedDatabase = async () => {
    console.log("Starting database seeding...");
    const batchSize = 400; // Firestore batch limit is 500
    let batch = writeBatch(db);
    let operationCount = 0;

    const commitBatch = async () => {
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
        console.log("Batch committed.");
    };

    // 1. Generate Current Students (Years 1-4)
    // Year 1: 2024 (Reg: 953024...)
    // Year 2: 2023 (Reg: 953023...)
    // Year 3: 2022 (Reg: 953022...)
    // Year 4: 2021 (Reg: 953021...)
    const currentYears = [
        { year: 1, code: '24' },
        { year: 2, code: '23' },
        { year: 3, code: '22' },
        { year: 4, code: '21' }
    ];

    for (const yearObj of currentYears) {
        for (const dept of DEPARTMENTS) {
            // Generate 5 students per dept per year
            for (let i = 1; i <= 5; i++) {
                const regNo = generateRegNo(yearObj.code, dept.code, i);
                const name = getRandomItem(NAMES) + " " + getRandomItem(NAMES); // Simple full name

                const studentData = {
                    name: name,
                    regNo: regNo,
                    email: `${regNo}@smtec.edu`,
                    dept: dept.name,
                    department: dept.name, // Duplicate for safety
                    year: yearObj.year,
                    semester: (yearObj.year * 2) - 1, // Odd semester
                    role: 'student',
                    cgpa: (Math.random() * (9.5 - 6.0) + 6.0).toFixed(1), // Random CGPA 6.0-9.5
                    createdAt: new Date().toISOString()
                };

                const userRef = doc(db, "users", regNo); // Use regNo as Doc ID for easy access
                batch.set(userRef, studentData);
                operationCount++;

                if (operationCount >= batchSize) await commitBatch();
            }
        }
    }

    // 2. Generate Alumni (2 Batches)
    // Batch 2020-2024 (Code: 20)
    // Batch 2019-2023 (Code: 19)
    const alumniBatches = [
        { batchName: '2020-2024', code: '20' },
        { batchName: '2019-2023', code: '19' }
    ];

    for (const batchObj of alumniBatches) {
        for (const dept of DEPARTMENTS) {
            // Generate 3 alumni per dept per batch
            for (let i = 1; i <= 3; i++) {
                const regNo = generateRegNo(batchObj.code, dept.code, i);
                const name = getRandomItem(NAMES) + " " + getRandomItem(NAMES);

                const alumniData = {
                    name: name,
                    regNo: regNo,
                    email: `${regNo}@smtec.edu`,
                    dept: dept.name,
                    department: dept.name,
                    role: 'alumni',
                    batch: batchObj.batchName,
                    cgpa: (Math.random() * (9.8 - 7.0) + 7.0).toFixed(1),
                    graduatedAt: new Date().toISOString()
                };

                const userRef = doc(db, "users", regNo);
                batch.set(userRef, alumniData);
                operationCount++;

                if (operationCount >= batchSize) await commitBatch();

                // 3. Add Skills for Alumni ONLY
                // Generate 3-5 skills per alumni
                const skillCount = Math.floor(Math.random() * 3) + 3;
                for (let k = 0; k < skillCount; k++) {
                    const skillRef = doc(collection(db, "student_skills"));
                    const skillData = {
                        regNo: regNo,
                        studentName: name,
                        studentDept: dept.name,
                        skillName: getRandomItem(SKILL_ACTIVITIES),
                        points: Math.floor(Math.random() * 50) + 10, // 10-60 points
                        date: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), 1).toISOString(),
                        semester: Math.floor(Math.random() * 8) + 1,
                        year: Math.floor(Math.random() * 4) + 1,
                        createdAt: new Date().toISOString()
                    };
                    batch.set(skillRef, skillData);
                    operationCount++;
                    if (operationCount >= batchSize) await commitBatch();
                }
            }
        }
    }

    if (operationCount > 0) await commitBatch();
    console.log("Database seeding completed successfully!");
    return "Success";
};
