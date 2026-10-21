import axiosInstance from '../lib/axios';

export interface ChatbotAskRequest {
  question: string;
  patientId?: string;
}

export interface ChatbotAskResponse {
  intent: string;
  confidence: number;
  answer: string;
}

export interface ChatbotIntentResponse {
  intent: string;
  confidence: number;
}

/**
 * Sends a question to the ML Care Chatbot and receives a deterministic, data-backed answer.
 */
export async function askChatbot(data: ChatbotAskRequest): Promise<ChatbotAskResponse> {
  const response = await axiosInstance.post<ChatbotAskResponse>('/chatbot/ask', data);
  return response.data;
}

/**
 * Classifies the intent of a question without querying patient data.
 */
export async function classifyChatbotIntent(question: string): Promise<ChatbotIntentResponse> {
  const response = await axiosInstance.post<ChatbotIntentResponse>('/chatbot/intent', { question });
  return response.data;
}
