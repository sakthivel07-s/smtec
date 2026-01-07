import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
let genAI = null;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
}

const MODELS_TO_TRY = [
    
    "gemini-2.5-flash",
    "gemini-2.0-flash-exp",
    "gemini-exp-1206",
    "gemini-3.0-pro",
    "gemini-2.5-pro"
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithFallback(promptText, onRetry) {
    if (!genAI) throw new Error("AI not configured. Check VITE_GEMINI_API_KEY in .env");

    let lastError = null;

    // Phase 1: Try each model once without long waits
    for (const modelName of MODELS_TO_TRY) {
        try {
            if (onRetry) onRetry(`Connecting to ${modelName}...`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { temperature: 0.7 }
            });

            const result = await model.generateContent(promptText);
            console.log(`[AI] ✨ SUCCESS with: ${modelName}`);
            return result;
        } catch (error) {
            lastError = error;
            const status = (error.message || "").toLowerCase();
            
            if (status.includes('429') || status.includes('quota') || status.includes('too many requests')) {
                console.warn(`[AI] ⏳ Quota hit for ${modelName}. Rotating...`);
                // Move to next model immediately
                continue;
            }

            console.warn(`[AI] ❌ Model ${modelName} failed: ${error.message}`);
            // Also continue for 404 or other transient errors
        }
    }

    // Phase 2: If all models failed, wait and retry once with the most stable one
    console.warn(`[AI] 🚨 All models exhausted. Waiting for quota reset...`);
    
    const waitTime = 30; // Reduced from 75s to 30s
    for (let i = waitTime; i > 0; i--) {
        if (onRetry) onRetry(`All AI paths busy. Retrying in ${i}s...`);
        await sleep(1000);
    }

    try {
        if (onRetry) onRetry(`Final attempt with gemini-3.0-flash...`);
        const model = genAI.getGenerativeModel({ model: "gemini-3.0-flash" });
        return await model.generateContent(promptText);
    } catch (finalError) {
        console.error("[AI] Critical Failure:", finalError);
        const errorMsg = (finalError.message || "").toLowerCase();
        if (errorMsg.includes('limit: 0')) {
            throw new Error(`AI Quota Blocked: Google now requires an active Billing Account in your Cloud Project to enable free tier quotas. Please check your Google AI Studio settings.`);
        }
        throw new Error(`AI Limit Reached: All models are currently busy. Please try again in 2 minutes.`);
    }
}

export const isAIConfigured = () => !!API_KEY;

export const generateResumeContent = async (studentProfile, skills, additionalInfo = {}, onRetry) => {
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

    const result = await generateWithFallback(prompt, onRetry);
    const response = await result.response;
    const text = response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(jsonStr);
};

export const parseLeaderboardQuery = async (queryText, onRetry) => {
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

    const result = await generateWithFallback(prompt, onRetry);
    const response = await result.response;
    const text = response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(jsonStr);
};

export const evaluateInterviewAnswer = async (question, answer, topic, onRetry) => {
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

    const result = await generateWithFallback(prompt, onRetry);
    const response = await result.response;
    const text = response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(jsonStr);
};

export const generateInterviewQuestion = async (topic, difficulty = "Intermediate", onRetry) => {
    if (!genAI) throw new Error("AI not configured");

    const prompt = `Generate one single ${difficulty} level technical interview question for the topic: "${topic}". Return only the question text.`;

    const result = await generateWithFallback(prompt, onRetry);
    const response = await result.response;
    return response.text();
};

export const parseNaturalLanguageQuery = async (queryText, onRetry) => {
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

    const result = await generateWithFallback(prompt, onRetry);
    const response = await result.response;
    const text = response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(jsonStr);
};

export const enhanceProfessionalSummary = async (summaryText, onRetry) => {
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

    const result = await generateWithFallback(prompt, onRetry);
    const response = await result.response;
    const text = response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(jsonStr);
};

export const evaluateGitHubPortfolio = async (username, repos, onRetry) => {
    if (!genAI) throw new Error("AI not configured");

    const repoSummary = repos.map(r => ({
        name: r.name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        isFork: r.fork,
        size: r.size,
        updated: r.updated_at
    })).slice(0, 20); // Increased limit for better context

    const prompt = `
    You are a Senior Technical Recruiter and Expert Software Architect.
    Your mission is to provide a FAIR, STRICT, and DATA-DRIVEN evaluation of a developer's GitHub portfolio.
    
    USER: "${username}"
    REPOS DATA: ${JSON.stringify(repoSummary)}

    SCORING RUBRIC (BE VERY STRICT):
    - 0-30: [Low Impact] Profile has mostly forked repos, empty repos, or very basic tutorial-level files.
    - 31-55: [Beginner] Shows original projects like simple landing pages, basic JS games, or CLI tools.
    - 56-75: [Intermediate] Multi-file applications, use of frameworks (React, Node, etc.), some database integration, and clear project goals.
    - 76-90: [Advanced] Full-stack systems, evidence of architectural patterns, cohesive tech stacks, and repos with meaningful documentation/stars.
    - 91-100: [Expert] High complexity, original libraries, high-star counts, or advanced algorithmic work. Use this sparingly.

    CRITICAL FAIRNESS RULES:
    1. FORKS: Do NOT give high scores to "isFork: true" repos unless the user has significant contributions.
    2. DESCRIPTIONS: Lack of repo descriptions suggests poor documentation - penalize this.
    3. VARIETY: Evaluate if they stick to one language or show versatility.
    4. RECENCY: Value active development (refer to updated_at).

    EXPECTED OUTPUT (Strict JSON):
    {
        "score": number, (0-100)
        "title": "Creative Dev Title (e.g. MERN Architect, Cloud Specialist)",
        "techStack": ["Extracted", "Primary", "Skills"],
        "featuredProjects": [
            { "name": "Project Name", "description": "Detailed 1-sentence technical breakdown", "highlights": ["Key feature", "Tech used"] }
        ],
        "strengths": ["Strength 1 (Impactful)", "Strength 2", "Strength 3"],
        "weakness": "One constructive area for improvement",
        "summary": "1-2 sentence professional verdict for a recruiter."
    }
    `;

    const result = await generateWithFallback(prompt, onRetry);
    const response = await result.response;
    const text = response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(jsonStr);
};
