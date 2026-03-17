import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInterviewStore } from '../stores/interviewStore';
import { interviewAPI, cheatAPI } from '../services/api';
import { Mic, MicOff, Send, Clock, ChevronLeft, ChevronRight, AlertTriangle, Camera, Volume2 } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs-backend-webgl'; // Ensure webgl backend is available

const CodeEditor = lazy(() => import('../components/editor/CodeEditor'));

// ─── Timer Component ───
function Timer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
    const [time, setTime] = useState(seconds);
    useEffect(() => {
        if (time <= 0) { onExpire(); return; }
        const interval = setInterval(() => setTime((t) => t - 1), 1000);
        return () => clearInterval(interval);
    }, [time, onExpire]);

    const mins = Math.floor(time / 60);
    const secs = time % 60;
    const isLow = time < 60;

    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-bold ${isLow ? 'bg-red-500/15 text-red-400 animate-pulse' : 'bg-dark-800/60 text-white'}`}>
            <Clock size={18} />
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>
    );
}

// ─── Introduction Round ───
function IntroRound({ interviewId, onComplete }: { interviewId: string; onComplete: () => void }) {
    const [transcript, setTranscript] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const recognitionRef = useRef<any>(null);
    const isRecordingRef = useRef(false);

    const startRecording = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech recognition not supported in this browser. Please type your introduction.');
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        let finalTranscript = '';

        recognition.onresult = (e: any) => {
            let interimTranscript = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) {
                    finalTranscript += t + ' ';
                } else {
                    interimTranscript = t;
                }
            }
            setTranscript(finalTranscript + interimTranscript);
        };

        recognition.onerror = (e: any) => {
            console.error('Speech error:', e.error);
            // Don't stop recording for transient network errors
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                setIsRecording(false);
                isRecordingRef.current = false;
                setError('Microphone access denied. Please allow microphone permissions and try again.');
            }
        };

        // Auto-restart when browser stops unexpectedly
        recognition.onend = () => {
            if (isRecordingRef.current) {
                try { recognition.start(); } catch { /* ignore */ }
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
        isRecordingRef.current = true;
    };

    const stopRecording = () => {
        isRecordingRef.current = false;
        recognitionRef.current?.stop();
        setIsRecording(false);
    };

    const handleSubmit = async () => {
        if (!transcript.trim()) return;
        setLoading(true);
        setError('');
        try {
            await interviewAPI.submitIntro(interviewId, transcript);
            onComplete();
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to submit introduction. Please try again.';
            setError(msg);
            console.error('Intro submit error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="glass-card p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Introduction Round</h2>
                        <p className="text-dark-400 mt-1">Introduce yourself — speak or type your introduction</p>
                    </div>
                    <Timer seconds={300} onExpire={handleSubmit} />
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
                )}

                {/* Camera Feed Placeholder */}
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex items-center gap-2 badge-success">
                        <Camera size={14} />
                        Camera Active
                    </div>
                    <div className="flex items-center gap-2 badge-info">
                        <Volume2 size={14} />
                        Audio Monitoring
                    </div>
                </div>

                {/* Recording Controls */}
                <div className="flex gap-3 mb-6">
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${isRecording
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                            : 'bg-primary-500/15 text-primary-400 border border-primary-500/30 hover:bg-primary-500/25'
                            }`}
                    >
                        {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </button>
                    {isRecording && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Recording...
                        </div>
                    )}
                </div>

                {/* Transcript */}
                <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Your introduction will appear here as you speak, or you can type it directly..."
                    className="input-field min-h-[200px] resize-y mb-6"
                    rows={8}
                />

                <button
                    onClick={handleSubmit}
                    disabled={!transcript.trim() || loading}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>AI is analyzing your introduction...</span>
                        </>
                    ) : (
                        <>
                            <Send size={18} />
                            Submit Introduction
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// ─── Aptitude Round ───
function AptitudeRound({ interviewId, onComplete }: { interviewId: string; onComplete: () => void }) {
    const { aptitudeQuestions, setAptitudeQuestions, answers, setAnswer } = useInterviewStore();
    const [currentQ, setCurrentQ] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const loadQuestions = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await interviewAPI.generateAptitude(interviewId);
            const questions = res.data.data?.questions || res.data.data || [];
            if (Array.isArray(questions) && questions.length > 0) {
                setAptitudeQuestions(questions);
            } else {
                setError('No questions received from server. Please try again.');
            }
        } catch (err: any) {
            console.error('Failed to load aptitude questions:', err);
            setError(err?.response?.data?.message || err?.message || 'Failed to load questions. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [interviewId, setAptitudeQuestions]);

    useEffect(() => {
        loadQuestions();
    }, [loadQuestions]);

    const handleSubmit = useCallback(async () => {
        setSubmitting(true);
        try {
            await interviewAPI.submitAptitude(interviewId, answers);
            onComplete();
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    }, [interviewId, answers, onComplete]);

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto text-center py-20">
                <div className="w-12 h-12 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-dark-400">Loading aptitude questions...</p>
            </div>
        );
    }

    if (error || aptitudeQuestions.length === 0) {
        return (
            <div className="max-w-3xl mx-auto text-center py-20">
                <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <p className="text-white text-lg mb-2">Failed to load questions</p>
                <p className="text-dark-400 mb-6">{error || 'No questions available for this role.'}</p>
                <button onClick={loadQuestions} className="btn-primary px-6 py-2">
                    Retry
                </button>
            </div>
        );
    }

    const question = aptitudeQuestions[currentQ];
    if (!question) return null;

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="flex gap-6 flex-col lg:flex-row">
                {/* Question Navigator */}
                <div className="lg:w-56 shrink-0">
                    <div className="glass-card p-4 lg:sticky lg:top-24">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-dark-300">Questions</span>
                            <Timer seconds={1800} onExpire={handleSubmit} />
                        </div>
                        <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
                            {aptitudeQuestions.map((q, i) => (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQ(i)}
                                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${i === currentQ
                                        ? 'bg-primary-500 text-white'
                                        : answers[q.id]
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            : 'bg-dark-800/50 text-dark-400 border border-dark-700/50 hover:border-dark-600'
                                        }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center gap-3 text-xs text-dark-400">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Answered</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary-500" />Current</span>
                        </div>
                    </div>
                </div>

                {/* Question Area */}
                <div className="flex-1">
                    <div className="glass-card p-8">
                        <div className="flex items-center justify-between mb-4">
                            <span className={`badge ${question.difficulty === 'hard' ? 'badge-error' : question.difficulty === 'easy' ? 'badge-success' : 'badge-warning'}`}>
                                {question.difficulty}
                            </span>
                            <span className="text-dark-400 text-sm">
                                {currentQ + 1} / {aptitudeQuestions.length}
                            </span>
                        </div>

                        <h3 className="text-lg font-medium text-white mb-6 leading-relaxed">{question.question}</h3>

                        <div className="space-y-3">
                            {question.options.map((opt, oi) => (
                                <label
                                    key={oi}
                                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${answers[question.id] === String.fromCharCode(65 + oi)
                                        ? 'bg-primary-500/10 border-primary-500/40 text-white'
                                        : 'bg-dark-900/30 border-dark-700/50 text-dark-300 hover:border-dark-600 hover:bg-dark-900/50'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name={`q-${question.id}`}
                                        checked={answers[question.id] === String.fromCharCode(65 + oi)}
                                        onChange={() => setAnswer(question.id, String.fromCharCode(65 + oi))}
                                        className="sr-only"
                                    />
                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${answers[question.id] === String.fromCharCode(65 + oi)
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-dark-800 text-dark-400'
                                        }`}>
                                        {String.fromCharCode(65 + oi)}
                                    </span>
                                    <span className="text-sm leading-relaxed">{opt.replace(/^[A-D]\.\s*/, '')}</span>
                                </label>
                            ))}
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between mt-8">
                            <button
                                onClick={() => setCurrentQ((c) => Math.max(0, c - 1))}
                                disabled={currentQ === 0}
                                className="btn-ghost flex items-center gap-2 disabled:opacity-30"
                            >
                                <ChevronLeft size={18} />
                                Previous
                            </button>

                            {currentQ < aptitudeQuestions.length - 1 ? (
                                <button
                                    onClick={() => setCurrentQ((c) => c + 1)}
                                    className="btn-ghost flex items-center gap-2"
                                >
                                    Next
                                    <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {submitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            Submit Answers
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Technical / Coding Round ───
function TechnicalRound({ interviewId, onComplete }: { interviewId: string; onComplete: () => void }) {
    const { codingProblems, setCodingProblems, caseStudies, setCaseStudies } = useInterviewStore();
    const [currentProblem, setCurrentProblem] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [roundType, setRoundType] = useState<'coding' | 'case-study'>('coding');
    const [codes, setCodes] = useState<Record<number, string>>({});
    const [languages, setLanguages] = useState<Record<number, string>>({});
    const [caseAnswers, setCaseAnswers] = useState<Record<number, string>>({});
    const [runResults, setRunResults] = useState<Record<number, any>>({});
    const [running, setRunning] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await interviewAPI.generateCoding(interviewId);
                const data = res.data.data;
                if (data.type === 'coding') {
                    setCodingProblems(data.problems);
                    setRoundType('coding');
                    const initCodes: Record<number, string> = {};
                    const initLangs: Record<number, string> = {};
                    data.problems.forEach((p: any, i: number) => {
                        initCodes[i] = p.starterCode?.javascript || '// Write your solution here\n';
                        initLangs[i] = 'javascript';
                    });
                    setCodes(initCodes);
                    setLanguages(initLangs);
                } else {
                    setCaseStudies(data.problems);
                    setRoundType('case-study');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [interviewId, setCodingProblems, setCaseStudies]);

    const handleRunCode = async () => {
        if (roundType !== 'coding') return;
        setRunning(true);
        try {
            const problem = codingProblems[currentProblem];
            const res = await interviewAPI.runCode(
                interviewId,
                codes[currentProblem],
                languages[currentProblem],
                problem.testCases
            );
            setRunResults((prev) => ({ ...prev, [currentProblem]: res.data.data }));
        } catch (err) {
            console.error(err);
        } finally {
            setRunning(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            if (roundType === 'coding') {
                const submissions = codingProblems.map((p, i) => ({
                    code: codes[i] || '',
                    language: languages[i] || 'javascript',
                    problemDescription: p.title + ': ' + p.description,
                    testResults: runResults[i] || { passed: 0, total: p.testCases?.length || 0 },
                }));
                await interviewAPI.submitTechnical(interviewId, submissions);
            } else {
                const submissions = caseStudies.map((cs, i) => ({
                    code: caseAnswers[i] || '',
                    language: 'text',
                    problemDescription: cs.title + ': ' + cs.scenario,
                    testResults: { passed: 0, total: 0 },
                }));
                await interviewAPI.submitTechnical(interviewId, submissions);
            }
            onComplete();
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto text-center py-20">
                <div className="w-12 h-12 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-dark-400">AI is generating your challenge...</p>
            </div>
        );
    }

    if (roundType === 'case-study') {
        return (
            <div className="max-w-4xl mx-auto animate-fade-in">
                <div className="glass-card p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Case Study Round</h2>
                        <Timer seconds={5400} onExpire={handleSubmit} />
                    </div>

                    {/* Case Study Tabs */}
                    <div className="flex gap-2 mb-6">
                        {caseStudies.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentProblem(i)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentProblem === i ? 'bg-primary-500 text-white' : 'bg-dark-800/50 text-dark-400 hover:text-white'
                                    }`}
                            >
                                Case {i + 1}
                            </button>
                        ))}
                    </div>

                    {caseStudies[currentProblem] && (
                        <>
                            <h3 className="text-xl font-semibold text-white mb-3">{caseStudies[currentProblem].title}</h3>
                            <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-700/50 mb-4">
                                <p className="text-dark-300 leading-relaxed">{caseStudies[currentProblem].scenario}</p>
                            </div>
                            <div className="mb-4">
                                <h4 className="text-sm font-medium text-dark-300 mb-2">Questions to Address:</h4>
                                <ul className="space-y-1">
                                    {caseStudies[currentProblem].questions.map((q, qi) => (
                                        <li key={qi} className="text-dark-400 text-sm flex items-start gap-2">
                                            <span className="text-primary-400 font-bold mt-0.5">{qi + 1}.</span>{q}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <textarea
                                value={caseAnswers[currentProblem] || ''}
                                onChange={(e) => setCaseAnswers((prev) => ({ ...prev, [currentProblem]: e.target.value }))}
                                placeholder="Write your detailed analysis here..."
                                className="input-field min-h-[250px] resize-y mb-6"
                            />
                        </>
                    )}

                    <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
                        {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={18} />Submit All Answers</>}
                    </button>
                </div>
            </div>
        );
    }

    // Coding Round
    const problem = codingProblems[currentProblem];
    if (!problem) return null;

    return (
        <div className="max-w-7xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                    {codingProblems.map((p, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentProblem(i)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentProblem === i ? 'bg-primary-500 text-white' : 'bg-dark-800/50 text-dark-400 hover:text-white'
                                }`}
                        >
                            {p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1)}
                        </button>
                    ))}
                </div>
                <Timer seconds={5400} onExpire={handleSubmit} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Problem Description */}
                <div className="glass-card p-6 overflow-y-auto max-h-[75vh]">
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-xl font-bold text-white">{problem.title}</h3>
                        <span className={`badge ${problem.difficulty === 'hard' ? 'badge-error' : problem.difficulty === 'easy' ? 'badge-success' : 'badge-warning'}`}>
                            {problem.difficulty}
                        </span>
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none">
                        <p className="text-dark-300 leading-relaxed whitespace-pre-wrap">{problem.description}</p>
                        {problem.constraints?.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-semibold text-white mb-2">Constraints:</h4>
                                <ul className="text-dark-400 text-sm space-y-1">
                                    {problem.constraints.map((c, ci) => <li key={ci}>• {c}</li>)}
                                </ul>
                            </div>
                        )}
                        {problem.examples?.map((ex, ei) => (
                            <div key={ei} className="mt-4 p-3 rounded-lg bg-dark-900/50 border border-dark-700/50">
                                <p className="text-sm"><strong className="text-white">Example {ei + 1}:</strong></p>
                                <p className="text-sm text-dark-300"><strong>Input:</strong> {ex.input}</p>
                                <p className="text-sm text-dark-300"><strong>Output:</strong> {ex.output}</p>
                                {ex.explanation && <p className="text-sm text-dark-400"><strong>Explanation:</strong> {ex.explanation}</p>}
                            </div>
                        ))}
                    </div>

                    {/* Test Results */}
                    {runResults[currentProblem] && (
                        <div className="mt-6 border-t border-dark-700/50 pt-4">
                            <h4 className="text-sm font-semibold text-white mb-3">
                                Test Results: {runResults[currentProblem].passed}/{runResults[currentProblem].total} passed
                            </h4>
                            <div className="space-y-2">
                                {runResults[currentProblem].results?.map((r: any, ri: number) => (
                                    <div key={ri} className={`p-3 rounded-lg text-sm ${r.passed ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                                        <p className={r.passed ? 'text-green-400' : 'text-red-400'}>{r.passed ? '✓ Passed' : '✗ Failed'}</p>
                                        {!r.isHidden && (
                                            <>
                                                <p className="text-dark-400 mt-1">Input: {r.input}</p>
                                                <p className="text-dark-400">Expected: {r.expected}</p>
                                                <p className="text-dark-400">Got: {r.actual}</p>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Code Editor */}
                <div className="glass-card p-4 flex flex-col max-h-[75vh]">
                    {/* Language Selector */}
                    <div className="flex items-center justify-between mb-3">
                        <select
                            value={languages[currentProblem] || 'javascript'}
                            onChange={(e) => {
                                const lang = e.target.value;
                                setLanguages((prev) => ({ ...prev, [currentProblem]: lang }));
                                setCodes((prev) => ({
                                    ...prev,
                                    [currentProblem]: problem.starterCode?.[lang] || `// Write your ${lang} solution here\n`,
                                }));
                            }}
                            className="px-3 py-1.5 rounded-lg bg-dark-900/50 border border-dark-700 text-white text-sm outline-none focus:border-primary-500"
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                        </select>
                    </div>

                    {/* Monaco Editor (lazy loaded) */}
                    <div className="flex-1 rounded-xl overflow-hidden border border-dark-700/50 min-h-[400px]">
                        <Suspense fallback={<div className="w-full h-full skeleton" />}>
                            <CodeEditor
                                code={codes[currentProblem] || ''}
                                language={languages[currentProblem] || 'javascript'}
                                onChange={(val) => setCodes((prev) => ({ ...prev, [currentProblem]: val || '' }))}
                            />
                        </Suspense>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-4">
                        <button onClick={handleRunCode} disabled={running} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                            {running ? <div className="w-4 h-4 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" /> : '▶ Run Code'}
                        </button>
                        <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={16} />Submit All</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Anti-Cheat Provider ───
function AntiCheatProvider({ interviewId, children }: { interviewId: string; children: React.ReactNode }) {
    const { cheatWarnings, addCheatWarning } = useInterviewStore();
    const [showWarning, setShowWarning] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const streamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
    const detectionLoopRef = useRef<number | null>(null);
    const lastWarningTimeRef = useRef<number>(0);

    // Initialize TF.js and load model
    useEffect(() => {
        const initModel = async () => {
            try {
                await tf.ready();
                const model = await cocoSsd.load();
                modelRef.current = model;
                console.log('Anti-cheat vision model loaded');
            } catch (err) {
                console.error('Failed to load vision model:', err);
            }
        };
        initModel();
    }, []);

    useEffect(() => {
        // Start camera monitoring
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(console.error);
                }
            })
            .catch(err => {
                console.error("Camera access denied or failed", err);
                cheatAPI.log({ interviewId, type: 'camera_disabled', details: 'Failed to access camera' });
            });

        const triggerWarning = (message: string, type: string) => {
            const now = Date.now();
            // 5 second cooldown between visual warnings to prevent instant termination
            if (now - lastWarningTimeRef.current > 5000) {
                lastWarningTimeRef.current = now;
                addCheatWarning();
                setWarningMessage(message);
                setShowWarning(true);
                cheatAPI.log({ interviewId, type, details: message });
                setTimeout(() => setShowWarning(false), 3000);
            }
        };

        const detectFrame = async () => {
            if (videoRef.current && modelRef.current && videoRef.current.readyState === 4) {
                try {
                    const predictions = await modelRef.current.detect(videoRef.current);
                    
                    // Count people and look for phones
                    let personCount = 0;
                    let phoneDetected = false;

                    for (const p of predictions) {
                        if (p.class === 'person') personCount++;
                        if (p.class === 'cell phone') phoneDetected = true;
                    }

                    if (personCount > 1) {
                        triggerWarning(`Multiple people detected (${personCount})`, 'multiple_people');
                    } else if (phoneDetected) {
                        triggerWarning('Cell phone detected', 'cell_phone');
                    } else if (personCount === 0) {
                        // Optional: trigger warning if no person is visible for an extended period
                        // Leaving this out for now to avoid false positives if they lean down, but could add later
                    }
                } catch (err) {
                    console.error('Detection error:', err);
                }
            }
            detectionLoopRef.current = requestAnimationFrame(detectFrame);
        };

        // Start detection loop once video starts playing
        const handleVideoPlay = () => {
            if (!detectionLoopRef.current) {
                detectFrame();
            }
        };

        if (videoRef.current) {
            videoRef.current.addEventListener('play', handleVideoPlay);
        }

        const handleVisibilityChange = () => {
            if (document.hidden) {
                triggerWarning('Candidate switched tabs', 'tab_switch');
            }
        };

        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault();
            triggerWarning('Copy/paste attempted', 'copy_paste');
        };

        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            triggerWarning('Paste attempted', 'copy_paste');
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                triggerWarning('Candidate exited fullscreen', 'fullscreen_exit');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        // Request fullscreen
        document.documentElement.requestFullscreen?.().catch(() => { });

        return () => {
            if (detectionLoopRef.current) {
                cancelAnimationFrame(detectionLoopRef.current);
            }
            if (videoRef.current) {
                videoRef.current.removeEventListener('play', handleVideoPlay);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [interviewId, addCheatWarning]);

    return (
        <>
            {/* Hidden video element for TF.js analysis */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ display: 'none' }}
                width={640}
                height={480}
            />
            {showWarning && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
                    <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 backdrop-blur-xl">
                        <AlertTriangle size={20} />
                        <span className="font-medium">Warning! {warningMessage} ({cheatWarnings}/3)</span>
                    </div>
                </div>
            )}
            {cheatWarnings >= 3 && (
                <div className="fixed inset-0 z-50 bg-red-950/90 flex items-center justify-center">
                    <div className="glass-card p-8 max-w-md text-center">
                        <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Interview Terminated</h2>
                        <p className="text-dark-400">Too many violations detected. Your interview has been flagged.</p>
                    </div>
                </div>
            )}
            {children}
        </>
    );
}

// ─── Main Interview Page ───
export default function InterviewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentRound, setCurrentRound, setInterview, reset } = useInterviewStore();
    const [loading, setLoading] = useState(true);
    const [interviewData, setInterviewData] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await interviewAPI.getById(id!);
                const interview = res.data.data;
                setInterviewData(interview);
                setInterview(interview);
                setCurrentRound(interview.currentRound);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
        return () => reset();
    }, [id, setInterview, setCurrentRound, reset]);

    const handleRoundComplete = () => {
        if (currentRound < 2) {
            setCurrentRound(currentRound + 1);
        } else {
            navigate(`/results/${id}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen mesh-gradient flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-dark-400 text-lg">Loading interview...</p>
                </div>
            </div>
        );
    }

    const streamName = interviewData?.stream?.replace(/-/g, ' ') || '';
    const roundNames = ['Introduction', 'Aptitude', 'Technical'];

    return (
        <div className="min-h-screen mesh-gradient">
            {/* Top Bar */}
            <header className="sticky top-0 z-40 backdrop-blur-xl bg-dark-950/70 border-b border-dark-800/50">
                <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div>
                        <span className="text-sm font-medium text-white capitalize">{streamName} Interview</span>
                    </div>

                    {/* Round Progress */}
                    <div className="flex items-center gap-2">
                        {roundNames.map((name, i) => (
                            <div key={i} className="flex items-center gap-1">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${i < currentRound ? 'bg-green-500 text-white' :
                                    i === currentRound ? 'bg-primary-500 text-white' :
                                        'bg-dark-800 text-dark-500'
                                    }`}>
                                    {i < currentRound ? '✓' : i + 1}
                                </div>
                                <span className={`text-xs hidden sm:inline ${i === currentRound ? 'text-white' : 'text-dark-500'}`}>{name}</span>
                                {i < 2 && <div className={`w-6 h-0.5 ${i < currentRound ? 'bg-green-500' : 'bg-dark-700'}`} />}
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            <AntiCheatProvider interviewId={id!}>
                <main className="max-w-7xl mx-auto px-4 py-6">
                    {currentRound === 0 && <IntroRound interviewId={id!} onComplete={handleRoundComplete} />}
                    {currentRound === 1 && <AptitudeRound interviewId={id!} onComplete={handleRoundComplete} />}
                    {currentRound === 2 && <TechnicalRound interviewId={id!} onComplete={handleRoundComplete} />}
                </main>
            </AntiCheatProvider>
        </div>
    );
}
