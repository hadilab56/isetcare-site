export type Role = 'DECLARANT' | 'TECHNICIEN' | 'ADMINISTRATEUR';

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  role: Role;
  actif: boolean;
  departement: string | null;
  fonction: string | null;
  service: string | null;
  specialite: string | null;
  disponible: boolean | null;
}

export const ROLE_LABELS: Record<Role, string> = {
  DECLARANT: 'Déclarant',
  TECHNICIEN: 'Technicien',
  ADMINISTRATEUR: 'Administrateur',
};

// ---------- Étape 1 : Matériel ----------

export type EtatEquipement = 'EN_SERVICE' | 'EN_PANNE' | 'EN_MAINTENANCE' | 'HORS_SERVICE';

export const ETAT_LABELS: Record<EtatEquipement, string> = {
  EN_SERVICE: 'En service',
  EN_PANNE: 'En panne',
  EN_MAINTENANCE: 'En maintenance',
  HORS_SERVICE: 'Hors service',
};

export const ETATS = Object.keys(ETAT_LABELS) as EtatEquipement[];

export interface Salle {
  id: number;
  nom: string;
  batiment: string | null;
  etage: number | null;
}

export interface SalleInput {
  nom: string;
  batiment: string | null;
  etage: number | null;
}

export interface TypeEquipement {
  id: number;
  libelle: string;
  frequenceMaintenanceMois: number | null;
  dureeVieEstimeeMois: number | null;
}

export interface TypeInput {
  libelle: string;
  frequenceMaintenanceMois: number | null;
  dureeVieEstimeeMois: number | null;
}

export interface Equipement {
  id: number;
  reference: string;
  marque: string | null;
  modele: string | null;
  numeroSerie: string | null;
  dateAcquisition: string | null; // "AAAA-MM-JJ"
  prixAchat: number | null;
  etat: EtatEquipement;
  qrCode: string; // "ISETCARE:<reference>"
  salleId: number | null;
  salleNom: string | null;
  typeId: number | null;
  typeLibelle: string | null;
}

export interface EquipementInput {
  reference: string;
  marque: string | null;
  modele: string | null;
  numeroSerie: string | null;
  dateAcquisition: string | null;
  prixAchat: number | null;
  etat: EtatEquipement;
  salleId: number;
  typeId: number;
}

export interface EquipementFiltres {
  q?: string;
  typeId?: number;
  salleId?: number;
  etat?: EtatEquipement;
}

// ---------- Étape 2 : Réclamations ----------

export type StatutReclamation = 'NOUVEAU' | 'AFFECTEE' | 'EN_COURS' | 'RESOLU' | 'CLOTURE';

export const STATUT_LABELS: Record<StatutReclamation, string> = {
  NOUVEAU: 'Nouvelle',
  AFFECTEE: 'Affectée',
  EN_COURS: 'En cours',
  RESOLU: 'Résolue',
  CLOTURE: 'Clôturée',
};

export const STATUTS = Object.keys(STATUT_LABELS) as StatutReclamation[];

export type Priorite = 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE';

export const PRIORITE_LABELS: Record<Priorite, string> = {
  BASSE: 'Basse',
  MOYENNE: 'Moyenne',
  HAUTE: 'Haute',
  URGENTE: 'Urgente',
};

export const PRIORITES = Object.keys(PRIORITE_LABELS) as Priorite[];

export interface Reclamation {
  id: number;
  description: string;
  avecPhoto: boolean;
  dateCreation: string; // "AAAA-MM-JJThh:mm:ss"
  statut: StatutReclamation;
  priorite: Priorite;
  categorie: string | null;
  equipementId: number;
  equipementReference: string;
  equipementLibelle: string;
  salleNom: string | null;
  declarantId: number;
  declarantNom: string;
  technicienId: number | null;
  technicienNom: string | null;
}

export interface ReclamationInput {
  equipementId: number;
  description: string;
  photo: File | null;
  categorie: string | null; // valeur finale (suggérée par l'IA puis éventuellement corrigée)
  priorite: Priorite | null; // idem
  ia: AiAnalysis | null; // suggestion brute de l'IA, conservée côté serveur (AnalyseIA)
}

export interface ReclamationFiltres {
  statut?: StatutReclamation;
  priorite?: Priorite;
  equipementId?: number;
}

// ---------- Étape 3 : IA (Gemini appelé uniquement par le backend Spring) ----------

export interface AiAnalysis {
  categorieSuggeree: string;
  typePanneProbable: string;
  prioriteSuggeree: string;
  scoreConfiance: number; // 0..1 (ou 0..100 selon le service)
  confiances?: Record<string, number>;
  regleSecuriteAppliquee?: boolean | string | null;
  aVerifier: boolean;
  source?: 'gemini' | 'regles';
  explication?: string;
}

export type AiDecision = 'REPARER' | 'SURVEILLER' | 'REMPLACER';

export interface AiRecommendation {
  decision: AiDecision;
  message: string;
  score: number;
  ratioCout: number;
  raisons: string[];
}

// ---------- Étape 4 : Interventions et historique ----------

export interface Intervention {
  id: number;
  reclamationId: number;
  equipementReference: string;
  diagnostic: string;
  actionEffectuee: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  dureeMinutes: number | null;
  cout: number | null;
  resultat: string | null;
  technicienId: number | null;
  technicienNom: string | null;
}

export interface InterventionInput {
  diagnostic: string;
  actionEffectuee: string | null;
  dateDebut: string | null; // "AAAA-MM-JJThh:mm"
  dateFin: string | null;
  cout: number | null;
  resultat: string | null;
}

export interface Historique {
  equipementId: number;
  reference: string;
  prixAchat: number | null;
  nbPannes: number;
  nbInterventions: number;
  coutCumule: number;
  dureeIndisponibiliteJours: number;
  reclamations: Reclamation[];
  interventions: Intervention[];
}

export type Decision = 'EN_ATTENTE' | 'REMPLACER' | 'REPARER';

export const DECISION_LABELS: Record<Decision, string> = {
  EN_ATTENTE: 'En attente',
  REMPLACER: 'Remplacer',
  REPARER: 'Réparer',
};

export interface DecisionRecord {
  id: number;
  decision: Decision;
  nbPannes: number | null;
  nbInterventions: number | null;
  coutCumuleReparations: number | null;
  coutRemplacementEstime: number | null;
  dureeIndisponibiliteJours: number | null;
  dateAnalyse: string | null;
}

// ---------- Étape 5 : Maintenance préventive ----------

export type StatutMaintenance = 'PLANIFIEE' | 'EN_RETARD' | 'REALISEE' | 'ANNULEE';

export const STATUT_MAINT_LABELS: Record<StatutMaintenance, string> = {
  PLANIFIEE: 'Planifiée',
  EN_RETARD: 'En retard',
  REALISEE: 'Réalisée',
  ANNULEE: 'Annulée',
};

export const STATUTS_MAINT = Object.keys(STATUT_MAINT_LABELS) as StatutMaintenance[];

export interface Maintenance {
  id: number;
  equipementId: number;
  equipementReference: string;
  equipementLibelle: string;
  salleNom: string | null;
  technicienId: number | null;
  technicienNom: string | null;
  datePlanifiee: string; // "AAAA-MM-JJ"
  dateRealisation: string | null;
  frequenceMois: number | null;
  statut: StatutMaintenance;
  rapport: string | null;
}

export interface MaintenanceInput {
  equipementId: number;
  technicienId: number;
  datePlanifiee: string;
}

// ---------- Étape 6 : Notifications ----------

export type TypeNotification =
  'NOUVELLE_RECLAMATION' | 'CHANGEMENT_STATUT' | 'RAPPEL_MAINTENANCE' | 'RETARD' | 'PANNES_FREQUENTES';

export const TYPE_NOTIF_LABELS: Record<TypeNotification, string> = {
  NOUVELLE_RECLAMATION: 'Réclamation',
  CHANGEMENT_STATUT: 'Statut',
  RAPPEL_MAINTENANCE: 'Maintenance',
  RETARD: 'Retard',
  PANNES_FREQUENTES: 'Pannes fréquentes',
};

export interface AppNotification {
  id: number;
  type: TypeNotification;
  message: string;
  dateEnvoi: string;
  lue: boolean;
}

// ---------- Étape 7 : Tableau de bord ----------

export interface StatLigne {
  libelle: string;
  valeur: number;
}

export interface Stats {
  nbEquipements: number;
  tauxDisponibilite: number;
  equipementsParEtat: Record<string, number>;
  reclamationsParStatut: Record<string, number>;
  reclamationsOuvertes: number;
  maintenancesEnRetard: number;
  pannesParType: StatLigne[];
  coutsParType: StatLigne[];
  coutTotal: number;
  delaiMoyenResolutionHeures: number | null;
}
