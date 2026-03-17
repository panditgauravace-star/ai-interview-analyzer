import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { Analytics, CheatLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, FileText, AlertTriangle, TrendingUp, ArrowLeft, Eye } from 'lucide-react';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

export default function AdminPage() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<'overview' | 'users' | 'interviews' | 'cheats'>('overview');
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [interviews, setInterviews] = useState<any[]>([]);
    const [cheatLogs, setCheatLogs] = useState<CheatLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                if (tab === 'overview') {
                    const res = await adminAPI.getAnalytics();
                    setAnalytics(res.data.data);
                } else if (tab === 'users') {
                    const res = await adminAPI.getUsers();
                    setUsers(res.data.data || []);
                } else if (tab === 'interviews') {
                    const res = await adminAPI.getInterviews();
                    setInterviews(res.data.data || []);
                } else if (tab === 'cheats') {
                    const res = await adminAPI.getCheatLogs();
                    setCheatLogs(res.data.data || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        setLoading(true);
        load();
    }, [tab]);

    const tabs = [
        { key: 'overview', label: 'Overview', icon: TrendingUp },
        { key: 'users', label: 'Users', icon: Users },
        { key: 'interviews', label: 'Interviews', icon: FileText },
        { key: 'cheats', label: 'Cheat Logs', icon: AlertTriangle },
    ];

    return (
        <div className="min-h-screen mesh-gradient">
            <header className="sticky top-0 z-40 backdrop-blur-xl bg-dark-950/70 border-b border-dark-800/50">
                <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
                    <button onClick={() => navigate('/dashboard')} className="btn-ghost flex items-center gap-2">
                        <ArrowLeft size={18} />
                        Dashboard
                    </button>
                    <span className="text-sm font-medium text-white">Admin Panel</span>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Tabs */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key as any)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${tab === t.key
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-dark-800/50 text-dark-400 hover:text-white hover:bg-dark-800'
                                }`}
                        >
                            <t.icon size={16} />
                            {t.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-10 h-10 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {/* Overview Tab */}
                        {tab === 'overview' && analytics && (
                            <div className="space-y-6">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Total Users', value: analytics.totalUsers, icon: Users, color: 'text-blue-400' },
                                        { label: 'Interviews', value: analytics.totalInterviews, icon: FileText, color: 'text-purple-400' },
                                        { label: 'Avg Score', value: Math.round(analytics.averageScore), icon: TrendingUp, color: 'text-green-400' },
                                        { label: 'Cheats Detected', value: analytics.totalCheats, icon: AlertTriangle, color: 'text-red-400' },
                                    ].map((stat) => (
                                        <div key={stat.label} className="glass-card p-5">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm text-dark-400">{stat.label}</span>
                                                <stat.icon size={18} className={stat.color} />
                                            </div>
                                            <p className="text-3xl font-bold text-white">{stat.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Stream Distribution */}
                                    <div className="glass-card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">Interviews by Stream</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={analytics.streamStats}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                <XAxis dataKey="_id" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                                                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }} />
                                                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Recommendations */}
                                    <div className="glass-card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">Hiring Recommendations</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={analytics.recommendationStats}
                                                    dataKey="count"
                                                    nameKey="_id"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={100}
                                                    label={({ _id, count }) => `${_id}: ${count}`}
                                                    labelLine={false}
                                                >
                                                    {analytics.recommendationStats.map((_, index) => (
                                                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Users Tab */}
                        {tab === 'users' && (
                            <div className="glass-card overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-dark-700/50">
                                            <th className="text-left p-4 text-dark-400 font-medium">Name</th>
                                            <th className="text-left p-4 text-dark-400 font-medium">Email</th>
                                            <th className="text-left p-4 text-dark-400 font-medium">Role</th>
                                            <th className="text-left p-4 text-dark-400 font-medium">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((u: any) => (
                                            <tr key={u._id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                                                <td className="p-4 text-white">{u.name}</td>
                                                <td className="p-4 text-dark-300">{u.email}</td>
                                                <td className="p-4"><span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-success'}`}>{u.role}</span></td>
                                                <td className="p-4 text-dark-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {users.length === 0 && <p className="text-dark-400 text-center py-8">No users found</p>}
                            </div>
                        )}

                        {/* Interviews Tab */}
                        {tab === 'interviews' && (
                            <div className="glass-card overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-dark-700/50">
                                            <th className="text-left p-4 text-dark-400 font-medium">Candidate</th>
                                            <th className="text-left p-4 text-dark-400 font-medium">Stream</th>
                                            <th className="text-left p-4 text-dark-400 font-medium">Status</th>
                                            <th className="text-left p-4 text-dark-400 font-medium">Score</th>
                                            <th className="text-left p-4 text-dark-400 font-medium">Date</th>
                                            <th className="text-left p-4 text-dark-400 font-medium">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {interviews.map((iv: any) => (
                                            <tr key={iv._id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                                                <td className="p-4 text-white">{iv.userId?.name || 'N/A'}</td>
                                                <td className="p-4 text-dark-300 capitalize">{iv.stream?.replace(/-/g, ' ')}</td>
                                                <td className="p-4"><span className={`badge ${iv.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{iv.status}</span></td>
                                                <td className="p-4 text-white font-medium">{iv.totalScore || '-'}</td>
                                                <td className="p-4 text-dark-400">{new Date(iv.createdAt).toLocaleDateString()}</td>
                                                <td className="p-4">
                                                    {iv.status === 'completed' && (
                                                        <button onClick={() => navigate(`/results/${iv._id}`)} className="btn-ghost text-primary-400 text-xs flex items-center gap-1">
                                                            <Eye size={14} /> View
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {interviews.length === 0 && <p className="text-dark-400 text-center py-8">No interviews found</p>}
                            </div>
                        )}

                        {/* Cheat Logs Tab */}
                        {tab === 'cheats' && (
                            <div className="glass-card overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-dark-700/50">
                                            <th className="text-left p-4 text-dark-400 font-medium">Candidate</th>
                                            <th className="text-left p-4 text-dark-400 font-medium">Type</th>
                                            <th className="text-left p-4 text-dark-400 font-medium">Details</th>
                                            <th className="text-left p-4 text-dark-400 font-medium">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cheatLogs.map((log) => (
                                            <tr key={log._id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                                                <td className="p-4 text-white">{typeof log.userId === 'object' ? log.userId.name : log.userId}</td>
                                                <td className="p-4"><span className="badge badge-error">{log.type.replace(/_/g, ' ')}</span></td>
                                                <td className="p-4 text-dark-300">{log.details}</td>
                                                <td className="p-4 text-dark-400">{new Date(log.timestamp).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {cheatLogs.length === 0 && <p className="text-dark-400 text-center py-8">No cheat logs found</p>}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
