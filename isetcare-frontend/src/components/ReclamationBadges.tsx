import { PRIORITE_LABELS, STATUT_LABELS, type Priorite, type StatutReclamation } from '../api/types';

export function StatutBadge({ statut }: { statut: StatutReclamation }) {
  return <span className={`badge statut-${statut}`}>{STATUT_LABELS[statut]}</span>;
}

export function PrioriteBadge({ priorite }: { priorite: Priorite }) {
  return <span className={`badge prio-${priorite}`}>{PRIORITE_LABELS[priorite]}</span>;
}
