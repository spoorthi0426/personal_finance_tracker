import axios from 'axios';

const api = axios.create({
  baseURL: 'https://personal-finance-tracker-1-7i5x.onrender.com/api',
});

export async function sendChatMessage(payload) {
  const response = await api.post('/chat/message', payload);
  return response.data;
}

export async function resetConversation(sessionId) {
  const response = await api.post('/chat/reset', { sessionId });
  return response.data;
}

export async function getMenu() {
  const response = await api.get('/chat/menu');
  return response.data;
}

export async function createExpense(payload) {
  const response = await api.post('/expenses', payload);
  return response.data;
}

export async function fetchExpensesByMobile(mobile) {
  const response = await api.get(`/expenses?mobile=${encodeURIComponent(mobile)}`);
  return response.data;
}

export async function updateExpense(id, payload) {
  const response = await api.put(`/expenses/${id}`, payload);
  return response.data;
}

export async function deleteExpense(id) {
  const response = await api.delete(`/expenses/${id}`);
  return response.data;
}

export async function fetchAnalytics(mobile) {
  const response = await api.get(`/expenses/analytics/summary?mobile=${encodeURIComponent(mobile)}`);
  return response.data;
}

export default api;

