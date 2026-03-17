import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { interviewAPI } from '../services/api';
import { InterviewResult } from '../types';
import {
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { ArrowLeft, Download, Trophy, TrendingUp, TrendingDown, Award, CheckCircle, XCircle } from 'lucide-react';

const RECOMMENDATION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    'strong-hire': { bg: 'bg-green-500/15', text: 'text-green-400', label: '🌟 Strong Hire' },
    'hire': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: '✅ Hire' },
    'neutral': { bg: 'bg-yellow-500/15', text: 'text-yellow-400', label: '⚖️ Neutral' },
    'reject': { bg: 'bg-red-500/15', text: 'text-red-400', label: '❌ Reject' },
};

export default function ResultsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [result, setResult] = useState<InterviewResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await interviewAPI.getResult(id!);
                setResult(res.data.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen mesh-gradient flex items-center justify-center">
                <div className="w-12 h-12 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!result) {
        return (
            <div className="min-h-screen mesh-gradient flex items-center justify-center">
                <div className="glass-card p-8 text-center max-w-md">
                    <XCircle size={48} className="text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Results Not Found</h2>
                    <p className="text-dark-400 mb-4">This interview may still be in progress.</p>
                    <Link to="/dashboard" className="btn-primary inline-flex">Go to Dashboard</Link>
                </div>
            </div>
        );
    }

    const rec = RECOMMENDATION_COLORS[result.recommendation] || RECOMMENDATION_COLORS['neutral'];

    const radarData = [
        { subject: 'Communication', value: result.ratings.communication },
        { subject: 'Technical', value: result.ratings.technical },
        { subject: 'Problem Solving', value: result.ratings.problemSolving },
        { subject: 'Confidence', value: result.ratings.confidence },
        { subject: 'Overall', value: result.ratings.overall },
    ];

    const barData = [
        { name: 'Introduction', score: result.breakdown.introduction.percentage, color: '#818cf8' },
        { name: 'Aptitude', score: result.breakdown.aptitude.percentage, color: '#a78bfa' },
        { name: 'Technical', score: result.breakdown.technical.percentage, color: '#c084fc' },
    ];

    return (
        <div className="min-h-screen mesh-gradient">
            <header className="sticky top-0 z-40 backdrop-blur-xl bg-dark-950/70 border-b border-dark-800/50">
                <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                    <button onClick={() => navigate('/dashboard')} className="btn-ghost flex items-center gap-2">
                        <ArrowLeft size={18} />
                        Dashboard
                    </button>
                    <span className="text-sm text-dark-400 capitalize">{result.stream.replace(/-/g, ' ')} Results</span>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
                {/* Score Hero */}
                <div className="glass-card p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 via-transparent to-purple-600/10" />
                    <div className="relative z-10">
                        <Trophy size={48} className="text-yellow-400 mx-auto mb-4" />
                        <div className="text-7xl font-bold text-white mb-2">
                            {result.totalScore}
                            <span className="text-3xl text-dark-400">/100</span>
                        </div>
                        <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full ${rec.bg} ${rec.text} text-lg font-semibold mt-4`}>
                            {rec.label}
                        </div>
                    </div>
                </div>

                {/* Score Breakdown + Radar Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bar Chart */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Score Breakdown</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={barData} barSize={40}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                                />
                                <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                                    {barData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Radar Chart */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Skills Radar</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="#334155" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <PolarRadiusAxis domain={[0, 10]} tick={{ fill: '#64748b', fontSize: 10 }} />
                                <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} strokeWidth={2} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <TrendingUp size={20} className="text-green-400" />
                            Strengths
                        </h3>
                        <ul className="space-y-2">
                            {result.strengths.map((s, i) => (
                                <li key={i} className="flex items-start gap-3 text-dark-300 text-sm">
                                    <CheckCircle size={16} className="text-green-400 mt-0.5 shrink-0" />
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <TrendingDown size={20} className="text-red-400" />
                            Areas for Improvement
                        </h3>
                        <ul className="space-y-2">
                            {result.weaknesses.map((w, i) => (
                                <li key={i} className="flex items-start gap-3 text-dark-300 text-sm">
                                    <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                                    {w}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* AI Report */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Award size={20} className="text-primary-400" />
                        AI Detailed Analysis
                    </h3>
                    <div className="text-dark-300 leading-relaxed whitespace-pre-wrap text-sm">
                        {result.aiReport}
                    </div>
                </div>

                {/* Ratings */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Detailed Ratings</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        {Object.entries(result.ratings).map(([key, value]) => (
                            <div key={key} className="text-center">
                                <div className="relative w-20 h-20 mx-auto mb-2">
                                    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                                        <circle cx="40" cy="40" r="35" fill="none" stroke="#334155" strokeWidth="6" />
                                        <circle
                                            cx="40" cy="40" r="35" fill="none" stroke="#6366f1" strokeWidth="6"
                                            strokeDasharray={`${(value / 10) * 220} 220`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
                                        {value}
                                    </span>
                                </div>
                                <span className="text-xs text-dark-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
