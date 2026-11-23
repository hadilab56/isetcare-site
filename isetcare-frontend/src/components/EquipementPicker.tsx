import { useEffect, useState } from 'react';
import { errorMessage } from '../api/client';
import { listEquipements } from '../api/materiel';
import type { Equipement } from '../api/types';
import EtatBadge from './EtatBadge';

interface Props {
  value: Equipement | null;
  /** Passer directement un setter useState (référence stable). */
  onChange: (e: Equipement | null) => void;
}

/**
 * Choix d'un équipement : recherche par référence / marque / modèle / n° de série.
 * On peut aussi coller le contenu d'un QR code ("ISETCARE:PC-001") : 
 * l'équipement est alors sélectionné directement.
 */
export default function EquipementPicker({ value, onChange }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Equipement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fromQr = /^ISETCARE:/i.test(q.trim());
  const term = q.trim().replace(/^ISETCARE:/i, '').trim();

  useEffect(() => {
    if (value || term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      listEquipements({ q: term })
        .then((list) => {
          if (cancelled) return;
          const exact = list.find((e) => e.reference.toLowerCase() === term.toLowerCase());
          if (fromQr && exact) {
            onChange(exact);
            setQ('');
          } else {
            setResults(list.slice(0, 8));
          }
        })
        .catch((err) => { if (!cancelled) setError(errorMessage(err)); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [term, fromQr, value, onChange]);

  if (value) {
    return (
      <div className="picked">
        <div>
          <strong>{value.reference}</strong> <EtatBadge etat={value.etat} />
          <div className="muted small">
            {[value.typeLibelle, value.marque, value.modele].filter(Boolean).join(' · ')}
            {value.salleNom ? ` — ${value.salleNom}` : ''}
          </div>
        </div>
        <button type="button" className="btn btn-small btn-outline" onClick={() => onChange(null)}>Changer</button>
      </div>
    );
  }

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Référence, marque, modèle… ou contenu du QR code (ISETCARE:PC-001)"
        aria-label="Rechercher un équipement"
      />
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="muted small">Recherche…</p>}
      {results.length > 0 && (
        <ul className="picker">
          {results.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => { onChange(e); setQ(''); }}>
                <strong>{e.reference}</strong>
                <span className="muted"> {[e.marque, e.modele].filter(Boolean).join(' ')} {e.salleNom ? `— ${e.salleNom}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!loading && term.length >= 2 && results.length === 0 && !error && (
        <p className="muted small">Aucun équipement trouvé.</p>
      )}
    </div>
  );
}
