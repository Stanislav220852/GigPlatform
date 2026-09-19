import axios from 'axios';
import { AuthTokens } from '../types';

export const apiClient = {
  baseURL: '/api/v1',
  
  async get<T>(endpoint: string, params?: any) {
    const response = await axios.get(`${this.baseURL}${endpoint}`, { params });
    return response.data;
  },
  
  async post<T>(endpoint: string, data: any) {
    const response = await axios.post(`${this.baseURL}${endpoint}`, data);
    return response.data;
  },
  
  async put<T>(endpoint: string, data: any) {
    const response = await axios.put(`${this.baseURL}${endpoint}`, data);
    return response.data;
  },
  
  async delete(endpoint: string) {
    await axios.delete(`${this.baseURL}${endpoint}`);
  },
};
