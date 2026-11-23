import api from './client';
import type { Stats } from './types';

export const getStats = async (): Promise<Stats> => (await api.get<Stats>('/stats')).data;
