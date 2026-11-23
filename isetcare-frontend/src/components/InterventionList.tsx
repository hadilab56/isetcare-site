import type { Intervention } from '../api/types';
import { formatDateTime, formatDuree, formatPrix } from '../utils/format';

/** Liste chronologique des interventions (la plus récente en premier). */
export default function InterventionList({ items }: { items: Intervention[] }) {
  if (items.length === 0) return <p className="muted">Aucune intervention enregistrée.</p>;
  return (
    <ul className="timeline">
      {items.map((i) => (
        <li key={i.id}>
          <div className="timeline-head">
            <strong>{i.dateDebut ? formatDateTime(i.dateDebut) : 'Date inconnue'}</strong>
            <span className="muted"> — {i.technicienNom ?? 'Technicien inconnu'}</span>
            {i.resultat && <span className="tag"> {i.resultat}</span>}
          </div>
          <p className="prewrap"><strong>Diagnostic :</strong> {i.diagnostic}</p>
          {i.actionEffectuee && <p className="prewrap"><strong>Action :</strong> {i.actionEffectuee}</p>}
          <p className="muted small">Durée : {formatDuree(i.dureeMinutes)} · Coût : {formatPrix(i.cout)}</p>
        </li>
      ))}
    </ul>
  );
}
