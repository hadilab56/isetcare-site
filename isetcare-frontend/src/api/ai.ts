import api from './client';
import type { AiAnalysis, AiRecommendation } from './types';

// Le site n'appelle JAMAIS le service Python directement : il passe par Spring Boot (/api/ai/...).

/** Suggestion de catégorie / type de panne / priorité à partir de la description (Gemini côté serveur, ou mots-clés si aucune clé n'est configurée). */
export const analyzeDescription = async (description: string, equipementId?: number): Promise<AiAnalysis> =>
  (await api.post<AiAnalysis>('/ai/analyze', { description, equipementId })).data;

export type ChatMessage = { role: 'user' | 'model'; text: string };
export type ChatReply = { reply: string; source: 'gemini' | 'hors-ligne' };

/** Assistant de discussion (Gemini côté serveur). */
export const chatWithAssistant = async (messages: ChatMessage[]): Promise<ChatReply> =>
  (await api.post<ChatReply>('/ai/chat', { messages })).data;

/** Recommandation réparer / surveiller / remplacer pour un équipement (administrateur). */
export const recommendReplacement = async (equipementId: number): Promise<AiRecommendation> =>
  (await api.post<AiRecommendation>('/ai/recommend-replacement', { equipementId })).data;
