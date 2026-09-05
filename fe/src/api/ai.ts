import axiosInstance from '../lib/axios';

export const createSession = async (patientId: string) => {
  const response = await axiosInstance.post('/ai/sessions', { patientId });
  return response.data;
};

export const sendChat = async (data: { patientId: string; messages: { role: string; content: string }[]; sessionId?: string | null }) => {
  const response = await axiosInstance.post('/ai/chat', {
    patientId: data.patientId,
    sessionId: data.sessionId,
    messages: data.messages,
  }, {
    adapter: 'fetch',
    responseType: 'stream',
  });
  return response;
};

export const updateSessionTitle = async (sessionId: string, title: string) => {
  const response = await axiosInstance.patch(`/ai/sessions/${sessionId}/title`, { title });
  return response.data;
};