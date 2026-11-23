import api from './client';
import { PRIORITES, type Priorite, type Reclamation, type ReclamationFiltres, type ReclamationInput, type User } from './types';

// Liste filtrée automatiquement par le serveur selon le rôle (déclarant : les siennes ; technicien : celles affectées).
export const listReclamations = async (filtres: ReclamationFiltres = {}): Promise<Reclamation[]> =>
  (await api.get<Reclamation[]>('/reclamations', { params: filtres })).data;

export const getReclamation = async (id: number): Promise<Reclamation> =>
  (await api.get<Reclamation>(`/reclamations/${id}`)).data;

/** Envoi en multipart/form-data (texte + fichier). Le navigateur ajoute lui-même l'en-tête Content-Type. */
export const createReclamation = async (input: ReclamationInput): Promise<Reclamation> => {
  const form = new FormData();
  form.append('equipementId', String(input.equipementId));
  form.append('description', input.description);
  if (input.categorie) form.append('categorie', input.categorie);
  if (input.priorite) form.append('priorite', input.priorite);
  if (input.ia) {
    form.append('iaCategorie', input.ia.categorieSuggeree ?? '');
    const p = input.ia.prioriteSuggeree;
    if (PRIORITES.includes(p as Priorite)) form.append('iaPriorite', p);
    form.append('iaTypePanne', input.ia.typePanneProbable ?? '');
    if (Number.isFinite(input.ia.scoreConfiance)) form.append('iaScore', String(input.ia.scoreConfiance));
  }
  if (input.photo) form.append('photo', input.photo);
  return (await api.post<Reclamation>('/reclamations', form)).data;
};

/** La photo est protégée : on la télécharge avec le token (blob), puis on l'affiche. */
export const fetchPhoto = async (id: number): Promise<Blob> =>
  (await api.get<Blob>(`/reclamations/${id}/photo`, { responseType: 'blob' })).data;

export const affecterTechnicien = async (id: number, technicienId: number): Promise<Reclamation> =>
  (await api.patch<Reclamation>(`/reclamations/${id}/affectation`, { technicienId })).data;

export const changerPriorite = async (id: number, priorite: Priorite): Promise<Reclamation> =>
  (await api.patch<Reclamation>(`/reclamations/${id}/priorite`, { priorite })).data;

export const cloturerReclamation = async (id: number): Promise<Reclamation> =>
  (await api.patch<Reclamation>(`/reclamations/${id}/cloture`)).data;

/** Techniciens actifs (liste réservée à l'administrateur, utilisée pour l'affectation). */
export const listTechniciens = async (): Promise<User[]> =>
  (await api.get<User[]>('/users', { params: { role: 'TECHNICIEN' } })).data.filter((u) => u.actif);
