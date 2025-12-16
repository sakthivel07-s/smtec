import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
let genAI = null;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
}

const MODELS_TO_TRY = [
    "gemini-2.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro",
    "gemini-1.5-pro-001",
    "gemini-1.5-pro-002",
    "gemini-1.0-pro",
    "gemini-pro",
    "gemini-2.0-flash-exp"
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithFallback(promptText) {
    if (!genAI) throw new Error("AI not configured");

    let lastError = null;

    for (const modelName of MODELS_TO_TRY) {
        let retries = 0;
        while (retries < 3) {
            try {
                if (retries > 0) console.log(`[AI] Retrying model ${modelName} (Attempt ${retries + 1})...`);

                // Add temperature config as requested
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: { temperature: 0.7 }
                });
                const result = await model.generateContent(promptText);
                console.log(`[AI] Success with: ${modelName}`);
                return result;
            } catch (error) {
                lastError = error;
                // If Rate Limit (429), wait and retry the SAME model
                if (error.message.includes('429') || error.message.includes('quota')) {
                    console.warn(`[AI] Rate limit hit for ${modelName}. Waiting 5s...`);
                    await sleep(5000 * (retries + 1)); // Linear backoff: 5s, 10s
                    retries++;
                    continue;
                }

                // If 404 or other error, break and try NEXT model
                console.warn(`[AI] Model ${modelName} failed:`, error.message);
                break;
            }
        }
    }

    // Help User Debug
    console.error("All AI models failed. Please check your API Key permissions at https://aistudio.google.com/.");
    throw lastError || new Error("All models failed.");
}

export const isAIConfigured = () => !!API_KEY;

export const generateResumeContent = async (studentProfile, skills, additionalInfo = {}) => {
    if (!genAI) throw new Error("AI not configured. Please add VITE_GEMINI_API_KEY to .env");

    const prompt = `
    You are an expert Career Coach and Resume Writer. 
    Create a professional resume content and career roadmap for a student.
    
    PROFILE:
    Name: ${studentProfile.name}
    Dept: ${studentProfile.dept} | Year: ${studentProfile.year} | CGPA: ${studentProfile.cgpa}
    Email: ${studentProfile.email}
    Phone: ${additionalInfo.phone || 'N/A'}
    Links: LinkedIn: ${additionalInfo.linkedin || 'N/A'}, Portfolio: ${additionalInfo.portfolio || 'N/A'}, GitHub: ${additionalInfo.github || 'N/A'}

    SKILLS:
    Verified: ${skills.map(s => `${s.skill} (${s.level})`).join(', ')}
    Additional: ${additionalInfo.customSkills || ''}

    EXPERIENCE (Raw):
    ${additionalInfo.experience || 'None listed'}

    PROJECTS (Raw):
    ${additionalInfo.projects || 'None listed'}

    CERTIFICATIONS (Raw):
    ${additionalInfo.certifications || 'None listed'}

    TASK:
    1. Analyze the raw data.
    2. Enhance/Rewrite Experience and Projects into professional bullet points (STAR method).
    3. Generate a powerful tailored Professional Summary.
    4. Provide Career Roadmap & Strengths as before.

    Output strictly valid JSON:
    {
        "summary": "Professional summary paragraph...",
        "enhancedExperience": [
            { "role": "Role Title", "company": "Company/Org", "duration": "Dates", "points": ["Action verb bullet 1...", "Bullet 2..."] }
        ],
        "enhancedProjects": [
            { "title": "Project Name", "techStack": "React, Node...", "points": ["Built x using y...", "Achieved z..."] }
        ],
        "topStrengths": ["Strength 1", "Strength 2", ...],
        "recommendedRoles": ["Role 1", "Role 2", ...],
        "roadmap": [
            { "step": "Step 1", "description": "..." },
             { "step": "Step 2", "description": "..." }
        ],
        "missingSkills": ["Skill 1", "Skill 2"]
    }
    `;

    const result = await generateWithFallback(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(jsonStr);
};

export const parseLeaderboardQuery = async (queryText) => {
    if (!genAI) throw new Error("AI not configured");

    const prompt = `
    You are an AI that converts natural language queries into structured filters for a Student Leaderboard.
    The leaderboard data has these fields: name, regNo, dept (CSE, ECE, EEE, MECH, CIVIL, IT, AI&DS), year (1, 2, 3, 4), points (number).

    Query: "${queryText}"

    Extract the following filters (return null if not specified):
    - minPoints: number (e.g. "more than 50 points" -> 51)
    - maxPoints: number
    - dept: string (normalized to Dept codes)
    - year: number
    - sortOrder: "desc" (default for "top", "highest") or "asc"
    - limit: number (e.g. "top 10" -> 10)

    Output strictly valid JSON:
    {
        "minPoints": null,
        "maxPoints": null,
        "dept": null,
        "year": null,
        "sortOrder": "desc",
        "limit": 20
    }
    `;

    const result = await generateWithFallback(prompt);
    const text = result.response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(jsonStr);
};

export const evaluateInterviewAnswer = async (question, answer, topic) => {
    if (!genAI) throw new Error("AI not configured");

    const prompt = `
    You are a Technical Interviewer.
    Topic: ${topic}
    Question: "${question}"
    Student Answer: "${answer}"

    Evaluate the answer. Output JSON:
    {
        "score": 0-10,
        "feedback": "Constructive feedback...",
        "betterAnswer": "Example of a perfect answer..."
    }
    `;

    const result = await generateWithFallback(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(jsonStr);
};

export const generateInterviewQuestion = async (topic, difficulty = "Intermediate") => {
    if (!genAI) throw new Error("AI not configured");

    const prompt = `Generate one single ${difficulty} level technical interview question for the topic: "${topic}". Return only the question text.`;

    const result = await generateWithFallback(prompt);
    return result.response.text();
};

export const parseNaturalLanguageQuery = async (queryText) => {
    if (!genAI) throw new Error("AI not configured");

    const prompt = `
    Convert this natural language query into a JSON filter object for a student database.
    Query: "${queryText}"
    
    Database Fields: naming convention is camelCase.
    - name (string)
    - dept (string: CSE, ECE, EEE, MECH, CIVIL, AI&DS)
    - year (number: 1, 2, 3, 4)
    - cgpa (number)
    - arrears (number)
    - skills (array of strings - inferred from context)
    
    Output JSON only. Example: { "dept": "CSE", "year": 3, "minCgpa": 8.0 }
    If a skill is mentioned, verify if it sounds like a technical skill. 
    `;

    const result = await generateWithFallback(prompt);
    const text = result.response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(jsonStr);
};

export const enhanceProfessionalSummary = async (summaryText) => {
    if (!genAI) throw new Error("AI not configured");

    const prompt = `
    You are a professional editor.
    Analyze the following professional summary: "${summaryText}"

    1. Identify any grammatical errors or awkward phrasing.
    2. provide 3 enhanced, professional versions of this summary suitable for a tech resume.

    Output strictly valid JSON:
    {
        "feedback": "Brief grammar/style feedback...",
        "suggestions": [
            "Enhanced Version 1...",
            "Enhanced Version 2...",
            "Enhanced Version 3..."
        ]
    }
    `;

    const result = await generateWithFallback(prompt);
    const text = result.response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(jsonStr);
};
