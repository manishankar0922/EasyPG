import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('u9-auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Add a response interceptor for 402 Payment Required
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 402) {
      if (typeof window !== 'undefined') {
        const code = error.response.data?.code || 'SUBSCRIPTION_EXPIRED';
        window.location.href = `/dashboard/subscription?blocked=true&code=${code}`;
      }
    }
    
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/sign-in') {
        // Clear tokens and go to sign-in
        localStorage.removeItem('u9-auth-token');
        window.location.href = '/sign-in';
      }
    }

    if (error.response && error.response.status === 403) {
      if (typeof window !== 'undefined') {
        const errorMsg = error.response.data?.error;
        if (errorMsg === 'Account deactivated. Contact your owner.') {
          window.location.href = '/unauthorized?reason=deactivated';
        } else if (errorMsg === 'No branch assigned. Contact your admin.') {
          window.location.href = '/unauthorized?reason=no_branch';
        }
      }
    }

    if (!error.response) {
      // Network error - backend not reachable
      return Promise.reject(new Error('Cannot connect to server. Please check your connection.'));
    }

    return Promise.reject(error);
  }
);

export default api;
