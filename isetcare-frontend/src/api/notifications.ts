import api from './client';
import type { AppNotification } from './types';

export const listNotifications = async (): Promise<AppNotification[]> =>
  (await api.get<AppNotification[]>('/notifications')).data;

export const countUnread = async (): Promise<number> =>
  (await api.get<{ count: number }>('/notifications/non-lues')).data.count;

export const markRead = async (id: number): Promise<void> => { await api.patch(`/notifications/${id}/lue`); };

export const markAllRead = async (): Promise<void> => { await api.patch('/notifications/lues'); };

/** Prévient la cloche (barre du haut) qu'il faut recompter les notifications non lues. */
export const NOTIFICATIONS_CHANGED = 'notifications:changed';
