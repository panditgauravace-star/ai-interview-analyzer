import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error('No refresh token');

                const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
                const { accessToken, refreshToken: newRefresh } = res.data.data;

                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', newRefresh);
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;

                return api(originalRequest);
            } catch {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ──── Auth ────
export const authAPI = {
    sendOtp: (email: string) =>
        api.post('/auth/send-otp', { email }),
    verifyOtp: (email: string, otp: string) =>
        api.post('/auth/verify-otp', { email, otp }),
    signup: (data: { name: string; email: string; password: string }) =>
        api.post('/auth/signup', data),
    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
    refresh: (refreshToken: string) =>
        api.post('/auth/refresh', { refreshToken }),
};

// ──── Interview ────
export const interviewAPI = {
    create: (stream: string) =>
        api.post('/interview', { stream }),
    getById: (id: string) =>
        api.get(`/interview/${id}`),
    getUserInterviews: () =>
        api.get('/interview/my'),
    submitIntro: (id: string, transcript: string) =>
        api.post(`/interview/${id}/intro`, { transcript }),
    generateAptitude: (id: string) =>
        api.post(`/interview/${id}/aptitude/generate`),
    submitAptitude: (id: string, answers: Record<string, string>) =>
        api.post(`/interview/${id}/aptitude/submit`, { answers }),
    generateCoding: (id: string) =>
        api.post(`/interview/${id}/coding/generate`),
    runCode: (id: string, code: string, language: string, testCases: unknown[]) =>
        api.post(`/interview/${id}/code/run`, { code, language, testCases }),
    submitTechnical: (id: string, submissions: unknown[]) =>
        api.post(`/interview/${id}/technical/submit`, { submissions }),
    getResult: (id: string) =>
        api.get(`/interview/${id}/result`),
};

// ──── Cheat ────
export const cheatAPI = {
    log: (data: { interviewId: string; type: string; details: string }) =>
        api.post('/cheat/log', data),
};

// ──── Admin ────
export const adminAPI = {
    getUsers: () => api.get('/admin/users'),
    getInterviews: () => api.get('/admin/interviews'),
    getResults: () => api.get('/admin/results'),
    getAnalytics: () => api.get('/admin/analytics'),
    getCheatLogs: () => api.get('/cheat/logs'),
};

export default api;
