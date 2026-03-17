import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { INTERVIEW_STREAMS } from '../lib/streams';
import { interviewAPI } from '../services/api';
import { LogOut, Clock, Zap, ChevronRight, User, History } from 'lucide-react';

export default function DashboardPage() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [interviews, setInterviews] = useState<any[]>([]);

    const handleStartInterview = async (streamId: string) => {
        setLoading(streamId);
        try {
            const res = await interviewAPI.create(streamId);
            const interviewId = res.data.data.interviewId;
            navigate(`/interview/${interviewId}`);
        } catch (err) {
            console.error('Failed to create interview:', err);
        } finally {
            setLoading(null);
        }
    };

    const loadHistory = async () => {
        try {
            const res = await interviewAPI.getUserInterviews();
            setInterviews(res.data.data || []);
            setShowHistory(true);
        } catch (err) {
            console.error('Failed to load history:', err);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen mesh-gradient">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-dark-950/70 border-b border-dark-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-white hidden sm:block">AI Interview Analyzer</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={loadHistory} className="btn-ghost flex items-center gap-2 text-sm">
                            <History size={16} />
                            <span className="hidden sm:inline">History</span>
                        </button>
                        {user?.role === 'admin' && (
                            <button onClick={() => navigate('/admin')} className="btn-ghost flex items-center gap-2 text-sm">
                                <User size={16} />
                                <span className="hidden sm:inline">Admin</span>
                            </button>
                        )}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-800/50 border border-dark-700/50">
                            <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center text-white text-xs font-bold">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-dark-300 hidden sm:block">{user?.name}</span>
                        </div>
                        <button onClick={handleLogout} className="btn-ghost text-red-400 hover:text-red-300">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-10 animate-fade-in">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                        Welcome back, <span className="gradient-text">{user?.name}</span>
                    </h1>
                    <p className="text-dark-400 text-lg">Select an interview stream to begin your AI-powered assessment</p>
                </div>

                {/* History Modal */}
                {showHistory && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)}>
                        <div className="glass-card w-full max-w-2xl max-h-[70vh] overflow-y-auto m-4 p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                            <h2 className="text-xl font-bold text-white mb-4">Interview History</h2>
                            {interviews.length === 0 ? (
                                <p className="text-dark-400 py-8 text-center">No interviews yet. Start one below!</p>
                            ) : (
                                <div className="space-y-3">
                                    {interviews.map((iv: any) => (
                                        <div
                                            key={iv._id}
                                            className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-dark-700/50 hover:border-dark-600 transition-all cursor-pointer"
                                            onClick={() => {
                                                setShowHistory(false);
                                                if (iv.status === 'completed') navigate(`/results/${iv._id}`);
                                                else navigate(`/interview/${iv._id}`);
                                            }}
                                        >
                                            <div>
                                                <p className="font-medium text-white capitalize">{iv.stream.replace(/-/g, ' ')}</p>
                                                <p className="text-sm text-dark-400">{new Date(iv.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`badge ${iv.status === 'completed' ? 'badge-success' : iv.status === 'in-progress' ? 'badge-warning' : 'badge-info'}`}>
                                                    {iv.status}
                                                </span>
                                                {iv.status === 'completed' && (
                                                    <span className="text-lg font-bold text-white">{iv.totalScore}/100</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Stream Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {INTERVIEW_STREAMS.map((stream, index) => (
                        <div
                            key={stream.id}
                            className="glass-card-hover p-6 flex flex-col animate-fade-in group cursor-pointer"
                            style={{ animationDelay: `${index * 50}ms` }}
                            onClick={() => handleStartInterview(stream.id)}
                        >
                            {/* Icon */}
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stream.color} flex items-center justify-center text-2xl mb-4 transition-transform duration-300 group-hover:scale-110`}>
                                {stream.icon}
                            </div>

                            {/* Content */}
                            <h3 className="text-lg font-semibold text-white mb-2">{stream.name}</h3>
                            <p className="text-dark-400 text-sm mb-4 flex-1 leading-relaxed">{stream.description}</p>

                            {/* Meta */}
                            <div className="flex items-center justify-between pt-4 border-t border-dark-700/50">
                                <div className="flex items-center gap-3">
                                    <span className={`badge ${stream.difficulty === 'Hard' ? 'badge-error' : 'badge-warning'}`}>
                                        {stream.difficulty}
                                    </span>
                                    <span className="flex items-center gap-1 text-dark-500 text-xs">
                                        <Clock size={12} />
                                        {stream.duration}
                                    </span>
                                </div>
                                <ChevronRight size={18} className="text-dark-500 group-hover:text-primary-400 transition-colors group-hover:translate-x-1 transition-transform duration-300" />
                            </div>

                            {/* Loading Overlay */}
                            {loading === stream.id && (
                                <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <div className="w-8 h-8 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
