import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';

// Lazy loaded pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const InterviewPage = lazy(() => import('./pages/InterviewPage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 min
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

// Loading fallback
function PageLoader() {
    return (
        <div className="min-h-screen mesh-gradient flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-dark-400">Loading...</p>
            </div>
        </div>
    );
}

// Protected route wrapper
function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
    const { isAuthenticated, isLoading, user } = useAuthStore();

    if (isLoading) return <PageLoader />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (adminOnly && user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

    return <>{children}</>;
}

// Guest route (redirect if authenticated)
function GuestRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) return <PageLoader />;
    if (isAuthenticated) return <Navigate to="/dashboard" replace />;

    return <>{children}</>;
}

export default function App() {
    const checkAuth = useAuthStore((s) => s.checkAuth);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
                        <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
                        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
                        <Route path="/reset-password/:token" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
                        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                        <Route path="/interview/:id" element={<ProtectedRoute><InterviewPage /></ProtectedRoute>} />
                        <Route path="/results/:id" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
                        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </QueryClientProvider>
    );
}
