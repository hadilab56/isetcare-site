import api from './client';
import type { Decision, DecisionRecord, Historique, Intervention, InterventionInput, Reclamation } from './types';

// ----- Interventions d'une réclamation -----
export const listInterventions = async (reclamationId: number): Promise<Intervention[]> =>
  (await api.get<Intervention[]>(`/reclamations/${reclamationId}/interventions`)).data;

export const createIntervention = async (reclamationId: number, input: InterventionInput): Promise<Intervention> =>
  (await api.post<Intervention>(`/reclamations/${reclamationId}/interventions`, input)).data;

/** Technicien : AFFECTEE -> EN_COURS, puis EN_COURS -> RESOLU. */
export const changerStatut = async (reclamationId: number, statut: 'EN_COURS' | 'RESOLU'): Promise<Reclamation> =>
  (await api.patch<Reclamation>(`/reclamations/${reclamationId}/statut`, { statut })).data;

// ----- Historique et décisions d'un équipement -----
export const getHistorique = async (equipementId: number): Promise<Historique> =>
  (await api.get<Historique>(`/equipements/${equipementId}/historique`)).data;

export const listDecisions = async (equipementId: number): Promise<DecisionRecord[]> =>
  (await api.get<DecisionRecord[]>(`/equipements/${equipementId}/decisions`)).data;

export const saveDecision = async (
  equipementId: number, decision: Decision, coutRemplacementEstime: number | null,
): Promise<DecisionRecord> =>
  (await api.post<DecisionRecord>(`/equipements/${equipementId}/decisions`, { decision, coutRemplacementEstime })).data;

// ----- Correction des interventions (administrateur) -----
export const updateIntervention = async (id: number, input: InterventionInput): Promise<Intervention> =>
  (await api.put<Intervention>(`/interventions/${id}`, input)).data;

export const deleteIntervention = async (id: number): Promise<void> => {
  await api.delete(`/interventions/${id}`);
};
