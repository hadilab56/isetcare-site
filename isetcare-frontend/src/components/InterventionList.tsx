import { Pencil, Trash2 } from 'lucide-react';
import type { Intervention } from '../api/types';
import { formatDateTime, formatDuree, formatPrix } from '../utils/format';

interface Props {
  items: Intervention[];
  /** Fournis seulement pour l'administrateur : affichent les boutons Modifier / Supprimer. */
  onEdit?: (i: Intervention) => void;
  onDelete?: (i: Intervention) => void;
}

/** Liste chronologique des interventions (la plus récente en premier). */
export default function InterventionList({ items, onEdit, onDelete }: Props) {
  if (items.length === 0) return <p className="muted">Aucune intervention enregistrée.</p>;
  return (
    <ul className="timeline">
      {items.map((i) => (
        <li key={i.id}>
          <div className="timeline-head">
            <strong>{i.dateDebut ? formatDateTime(i.dateDebut) : 'Date inconnue'}</strong>
            <span className="muted"> — {i.technicienNom ?? 'Technicien inconnu'}</span>
            {i.resultat && <span className="tag"> {i.resultat}</span>}
            {(onEdit || onDelete) && (
              <span className="row-actions" style={{ marginLeft: 'auto' }}>
                {onEdit && (
                  <button type="button" className="btn btn-small" onClick={() => onEdit(i)}>
                    <Pencil size={14} /> Modifier
                  </button>
                )}
                {onDelete && (
                  <button type="button" className="btn btn-small danger" onClick={() => onDelete(i)}
                          aria-label="Supprimer l'intervention">
                    <Trash2 size={14} />
                  </button>
                )}
              </span>
            )}
          </div>
          <p className="prewrap"><strong>Diagnostic :</strong> {i.diagnostic}</p>
          {i.actionEffectuee && <p className="prewrap"><strong>Action :</strong> {i.actionEffectuee}</p>}
          <p className="muted small">Durée : {formatDuree(i.dureeMinutes)} · Coût : {formatPrix(i.cout)}</p>
        </li>
      ))}
    </ul>
  );
}
