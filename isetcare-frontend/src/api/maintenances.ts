import api from './client';
import type { Maintenance, MaintenanceInput, StatutMaintenance } from './types';

export const listMaintenances = async (statut?: StatutMaintenance): Promise<Maintenance[]> =>
  (await api.get<Maintenance[]>('/maintenances', { params: { statut } })).data;

export const planifierMaintenance = async (input: MaintenanceInput): Promise<Maintenance> =>
  (await api.post<Maintenance>('/maintenances', input)).data;

export const modifierMaintenance = async (id: number, input: MaintenanceInput): Promise<Maintenance> =>
  (await api.put<Maintenance>(`/maintenances/${id}`, input)).data;

export const annulerMaintenance = async (id: number): Promise<Maintenance> =>
  (await api.patch<Maintenance>(`/maintenances/${id}/annuler`)).data;

export const realiserMaintenance = async (id: number, rapport: string, dateRealisation: string | null): Promise<Maintenance> =>
  (await api.patch<Maintenance>(`/maintenances/${id}/realiser`, { rapport, dateRealisation })).data;
