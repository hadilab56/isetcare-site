import api from './client';
import type {
  Equipement, EquipementFiltres, EquipementInput, EtatEquipement,
  Salle, SalleInput, TypeEquipement, TypeInput,
} from './types';

// Toutes les requêtes du module Matériel passent par l'instance Axios de client.ts
// (qui ajoute le token JWT et gère le 401).

// ----- Salles -----
export const listSalles = async (): Promise<Salle[]> => (await api.get<Salle[]>('/salles')).data;
export const createSalle = async (input: SalleInput): Promise<Salle> => (await api.post<Salle>('/salles', input)).data;
export const updateSalle = async (id: number, input: SalleInput): Promise<Salle> =>
  (await api.put<Salle>(`/salles/${id}`, input)).data;
export const deleteSalle = async (id: number): Promise<void> => { await api.delete(`/salles/${id}`); };

// ----- Types d'équipement -----
export const listTypes = async (): Promise<TypeEquipement[]> => (await api.get<TypeEquipement[]>('/types')).data;
export const createType = async (input: TypeInput): Promise<TypeEquipement> =>
  (await api.post<TypeEquipement>('/types', input)).data;
export const updateType = async (id: number, input: TypeInput): Promise<TypeEquipement> =>
  (await api.put<TypeEquipement>(`/types/${id}`, input)).data;
export const deleteType = async (id: number): Promise<void> => { await api.delete(`/types/${id}`); };

// ----- Équipements -----
// Axios ignore les paramètres dont la valeur est undefined : on ne passe que les filtres renseignés.
export const listEquipements = async (filtres: EquipementFiltres = {}): Promise<Equipement[]> =>
  (await api.get<Equipement[]>('/equipements', { params: filtres })).data;
export const getEquipement = async (id: number): Promise<Equipement> =>
  (await api.get<Equipement>(`/equipements/${id}`)).data;
export const createEquipement = async (input: EquipementInput): Promise<Equipement> =>
  (await api.post<Equipement>('/equipements', input)).data;
export const updateEquipement = async (id: number, input: EquipementInput): Promise<Equipement> =>
  (await api.put<Equipement>(`/equipements/${id}`, input)).data;
export const changeEtat = async (id: number, etat: EtatEquipement): Promise<Equipement> =>
  (await api.patch<Equipement>(`/equipements/${id}/etat`, { etat })).data;
export const deleteEquipement = async (id: number): Promise<void> => { await api.delete(`/equipements/${id}`); };
