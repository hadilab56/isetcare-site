import api from './client';
import type { Role, User } from './types';

/** Données du formulaire de compte (mot de passe facultatif en modification). */
export interface UserInput {
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string | null;
  telephone: string | null;
  role: Role;
  departement: string | null;
  fonction: string | null;
  service: string | null;
  specialite: string | null;
  disponible: boolean | null;
}

export const listUsers = async (): Promise<User[]> => (await api.get<User[]>('/users')).data;

export const createUser = async (input: UserInput): Promise<User> => (await api.post<User>('/users', input)).data;

export const updateUser = async (id: number, input: UserInput): Promise<User> =>
  (await api.put<User>(`/users/${id}`, input)).data;

export const setUserActif = async (id: number, actif: boolean): Promise<User> =>
  (await api.patch<User>(`/users/${id}/actif`, { actif })).data;

/** Suppression définitive : refusée par le serveur si le compte a un historique (il faut alors le désactiver). */
export const deleteUser = async (id: number): Promise<void> => {
  await api.delete(`/users/${id}`);
};
