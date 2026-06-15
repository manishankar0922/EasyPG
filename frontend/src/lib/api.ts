import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
    || 'http://localhost:3001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Attach token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('easypg_token') || localStorage.getItem('u9-auth-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    console.log(
      '📤 API Call:',
      config.method?.toUpperCase(),
      config.baseURL + (config.url || '')
    )
  }
  return config
})

// Handle all responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const data = error.response?.data
    const url = error.config?.url
    const method = error.config?.method?.toUpperCase()

    // Show FULL error details always
    console.error('❌ API Error:', JSON.stringify({
      status,
      url: `${method} ${url}`,
      error: data?.error || data?.message || error.message,
      data,
      requestBody: (() => {
        try {
          return JSON.parse(error.config?.data || '{}')
        } catch { return error.config?.data }
      })()
    }, null, 2))

    // No response = backend not reachable
    if (!error.response) {
      return Promise.reject(
        new Error(
          'Backend not reachable. ' +
          'Is server running on port 3001?'
        )
      )
    }

    if (status === 401) {
      localStorage.removeItem('easypg_token')
      localStorage.removeItem('easypg_user')
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      return Promise.reject(
        new Error('Session expired. Please login.')
      )
    }

    if (status === 403) {
      return Promise.reject(
        new Error(
          data?.error || 'Access denied'
        )
      )
    }

    if (status === 404) {
      console.error(
        `404: Route "${url}" not found in backend.`,
        'Check backend routes are mounted correctly.'
      )
      return Promise.reject(
        new Error(
          `API route not found: ${url}. ` +
          'Check backend route registration.'
        )
      )
    }

    if (status === 500) {
      return Promise.reject(
        new Error(
          data?.error ||
          data?.message ||
          'Server error. Check backend terminal for real error.'
        )
      )
    }

    // Extract detailed validation messages if available
    let errorMessage = data?.error || error.message;
    if (data?.details) {
      if (Array.isArray(data.details)) {
        const detailsMsg = data.details.map((d: any) => `${d.field?.replace('body.', '') || 'Field'}: ${d.message || d}`).join(', ');
        errorMessage = `${errorMessage} - ${detailsMsg}`;
      } else if (typeof data.details === 'object') {
        const detailsMsg = Object.entries(data.details)
          .map(([field, messages]) => {
            const msgs = Array.isArray(messages) ? messages.join(', ') : messages;
            return `${field.replace('body.', '')}: ${msgs}`;
          })
          .join(' | ');
        errorMessage = `${errorMessage} - ${detailsMsg}`;
      }
    }

    return Promise.reject(
      new Error(errorMessage)
    )
  }
)

export default api

export const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('easypg_token') || localStorage.getItem('u9-auth-token');
};

export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = getToken();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('easypg_token');
      localStorage.removeItem('u9-auth-token');
      window.location.href = '/login';
    }
    return;
  }

  if (response.status === 404) {
    throw new Error(`Route not found: ${endpoint}`);
  }

  return response.json();
};
