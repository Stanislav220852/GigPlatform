import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('gigplatform_tokens');
  if (token) {
    const { access_token } = JSON.parse(token);
    if (access_token) {
      config.headers.Authorization = `Bearer ${access_token}`;
    }
  }
  return config;
});

export const api = {
  get: <T>(endpoint: string, params?: any) =>
    apiClient.get<T>(endpoint, { params }).then(r => r.data),
  post: <T>(endpoint: string, data?: any) =>
    apiClient.post<T>(endpoint, data).then(r => r.data),
  put: <T>(endpoint: string, data?: any) =>
    apiClient.put<T>(endpoint, data).then(r => r.data),
  delete: (endpoint: string) =>
    apiClient.delete(endpoint).then(r => r.data),
};
