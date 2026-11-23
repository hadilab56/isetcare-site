import { ETAT_LABELS, type EtatEquipement } from '../api/types';

/** Pastille colorée pour l'état d'un équipement (couleurs définies dans styles.css : .etat-<ETAT>). */
export default function EtatBadge({ etat }: { etat: EtatEquipement }) {
  return <span className={`badge etat-${etat}`}>{ETAT_LABELS[etat]}</span>;
}
