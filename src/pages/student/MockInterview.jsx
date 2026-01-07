import { useState } from 'react';
import { generateInterviewQuestion, evaluateInterviewAnswer, isAIConfigured } from '../../utils/aiService';
import { Loader2, MessageSquare, Send, CheckCircle, XCircle, BrainCircuit, RefreshCw, Trophy, BookOpen } from 'lucide-react';

export default function MockInterview() {
    // States: 'setup', 'interview', 'feedback'
    const [mode, setMode] = useState('setup');

    // Setup State
    const [topic, setTopic] = useState('');
    const [customTopic, setCustomTopic] = useState('');
    const [difficulty, setDifficulty] = useState('Intermediate');

    // Interview State
    const [question, setQuestion] = useState('');
    const [userAnswer, setUserAnswer] = useState('');
    const [loading, setLoading] = useState(false);

    // Feedback State
    const [feedback, setFeedback] = useState(null);
    const [retryStatus, setRetryStatus] = useState('');

    const topics = [
        { category: "Languages", items: ["HTML/CSS", "JavaScript", "Python", "Java", "C++", "C#", "PHP", "Swift", "Kotlin", "Go", "Ruby", "SQL"] },
        { category: "Frameworks/Libs", items: ["React", "Angular", "Vue.js", "Node.js", "Django", "Spring Boot", "Flutter"] },
        { category: "CS Concepts", items: ["Data Structures", "System Design"] },
        { category: "Aptitude", items: ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability"] },
        { category: "Soft Skills", items: ["Communication Skills", "Leadership", "Teamwork"] },
        { category: "Custom", items: ["Others"] }
    ];

    const startInterview = async () => {
        let selectedTopic = topic;
        if (topic === 'Others') {
            if (!customTopic.trim()) {
                alert("Please enter a custom topic.");
                return;
            }
            selectedTopic = customTopic;
        }

        if (!selectedTopic) return;

        if (!isAIConfigured()) {
            alert("Please add VITE_GEMINI_API_KEY to .env");
            return;
        }

        setLoading(true);
        setRetryStatus('Initializing AI...');
        try {
            const result = await generateInterviewQuestion(selectedTopic, difficulty, (status) => setRetryStatus(status));
            setQuestion(result);
            setMode('interview');
            setUserAnswer('');
            setFeedback(null);
        } catch (error) {
            console.error(error);
            alert(error.message || "Failed to generate question");
        } finally {
            setLoading(false);
            setRetryStatus('');
        }
    };



    const submitAnswer = async () => {
        if (!userAnswer.trim()) return;
        setLoading(true);

        let selectedTopic = topic;
        if (topic === 'Others') {
            selectedTopic = customTopic;
        }

        try {
            setRetryStatus('Analyzing response...');
            const result = await evaluateInterviewAnswer(question, userAnswer, selectedTopic, (status) => setRetryStatus(status));
            setFeedback(result);
            setMode('feedback');
        } catch (error) {
            console.error(error);
            alert(error.message || "Failed to evaluate answer");
        } finally {
            setLoading(false);
            setRetryStatus('');
        }
    };

    const nextQuestion = () => {
        startInterview();
    };

    const quitInterview = () => {
        setMode('setup');
        setTopic('');
        setCustomTopic('');
        setFeedback(null);
    };

    return (
        <div className="max-w-4xl mx-auto p-6 min-h-[600px] flex flex-col items-center justify-center font-sans animate-fade-in">
            {/* Header */}
            {/* ... (keep header) */}

            {/* SETUP MODE */}
            {mode === 'setup' && (
                <div className="w-full max-w-2xl bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-8">
                    <div>
                        <label className="block text-lg font-bold text-gray-900 dark:text-white mb-4">Choose Topic</label>
                        <div className="space-y-6">
                            {topics.map((cat, idx) => (
                                <div key={idx}>
                                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{cat.category}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {cat.items.map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setTopic(t)}
                                                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${topic === t ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200 dark:shadow-none' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-white dark:hover:bg-gray-700'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {topic === 'Others' && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Enter Custom Topic</label>
                            <input
                                type="text"
                                value={customTopic}
                                onChange={(e) => setCustomTopic(e.target.value)}
                                placeholder="e.g. Machine Learning, Rust, Project Management..."
                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            />
                        </div>
                    )}


                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Difficulty</label>
                        <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            <option>Beginner</option>
                            <option>Intermediate</option>
                            <option>Advanced</option>
                        </select>
                    </div>

                    <button
                        onClick={startInterview}
                        disabled={!topic || loading}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <BookOpen size={20} />}
                        {loading && retryStatus ? retryStatus : 'Start Interview'}
                    </button>
                </div>
            )}

            {/* INTERVIEW MODE */}
            {mode === 'interview' && (
                <div className="w-full max-w-2xl bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-6 animate-slide-up">
                    <div className="flex justify-between items-center text-sm text-gray-500 font-medium">
                        <span className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full">{topic} • {difficulty}</span>
                        <button onClick={quitInterview} className="hover:text-red-500 transition-colors">Quit</button>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-relaxed">
                            {question}
                        </h2>
                    </div>

                    <div className="space-y-2">
                        <textarea
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder="Type your answer here..."
                            className="w-full h-40 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none resize-none text-gray-900 dark:text-white"
                        />
                        <button
                            onClick={submitAnswer}
                            disabled={!userAnswer.trim() || loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                            {loading && retryStatus ? retryStatus : 'Submit Answer'}
                        </button>
                    </div>
                </div>
            )}

            {/* FEEDBACK MODE */}
            {mode === 'feedback' && feedback && (
                <div className="w-full max-w-2xl bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-6 animate-slide-up">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <Trophy className={feedback.score >= 7 ? "text-yellow-500" : "text-gray-400"} size={28} />
                            Score: <span className={feedback.score >= 7 ? "text-green-600" : "text-orange-600"}>{feedback.score}/10</span>
                        </h2>
                        <button onClick={quitInterview} className="text-gray-400 hover:text-gray-600">Exit</button>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            Feedback
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{feedback.feedback}</p>
                    </div>

                    <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20">
                        <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center gap-2">
                            <CheckCircle size={18} /> Model Answer
                        </h3>
                        <p className="text-green-800 dark:text-green-400 text-sm leading-relaxed">{feedback.betterAnswer}</p>
                    </div>

                    <button
                        onClick={nextQuestion}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={20} />
                        Next Question
                    </button>
                </div>
            )}
        </div>
    );
}
