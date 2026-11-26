import { useState, type FormEvent } from 'react';
import { errorMessage } from '../api/client';
import { createIntervention, updateIntervention } from '../api/suivi';
import type { Intervention } from '../api/types';
import { nowLocalInput } from '../utils/format';

const RESULTATS = ['Réparé', 'Partiellement réparé', 'Pièce remplacée', 'En attente de pièce', 'Non réparable'];

interface Props {
  reclamationId: number;
  /** Intervention à corriger (administrateur). Absente : nouvelle intervention. */
  intervention?: Intervention;
  onClose: () => void;
  onSaved: (i: Intervention) => void;
}

/** "AAAA-MM-JJThh:mm:ss" -> valeur d'un champ datetime-local. */
const versChamp = (d: string | null | undefined) => (d ? d.slice(0, 16) : '');

/** US17 / US19 : le technicien enregistre son diagnostic, l'action effectuée, la durée et le coût. */
export default function InterventionForm({ reclamationId, intervention, onClose, onSaved }: Props) {
  const [diagnostic, setDiagnostic] = useState(intervention?.diagnostic ?? '');
  const [action, setAction] = useState(intervention?.actionEffectuee ?? '');
  const [debut, setDebut] = useState(intervention ? versChamp(intervention.dateDebut) : nowLocalInput());
  const [fin, setFin] = useState(versChamp(intervention?.dateFin));
  const [cout, setCout] = useState(intervention?.cout != null ? String(intervention.cout) : '');
  const [resultat, setResultat] = useState(intervention?.resultat ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!diagnostic.trim()) return setError('Le diagnostic est obligatoire.');
    if (debut && fin && fin < debut) return setError('La date de fin doit être après la date de début.');
    if (cout !== '' && (!Number.isFinite(Number(cout)) || Number(cout) < 0)) return setError('Le coût doit être un nombre positif ou nul.');
    setSaving(true);
    try {
      const input = {
        diagnostic: diagnostic.trim(),
        actionEffectuee: action.trim() || null,
        dateDebut: debut || null,
        dateFin: fin || null,
        cout: cout === '' ? null : Number(cout),
        resultat: resultat || null,
      };
      const saved = intervention
        ? await updateIntervention(intervention.id, input)
        : await createIntervention(reclamationId, input);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal card wide" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <h3>{intervention ? "Modifier l'intervention" : 'Nouvelle intervention'}</h3>
        {error && <div className="alert alert-error">{error}</div>}

        <label htmlFor="diag">Diagnostic</label>
        <textarea id="diag" rows={3} required value={diagnostic} onChange={(e) => setDiagnostic(e.target.value)}
          placeholder="Ce que vous avez constaté…" />

        <label htmlFor="act">Action effectuée</label>
        <textarea id="act" rows={3} value={action} onChange={(e) => setAction(e.target.value)}
          placeholder="Ce que vous avez fait pour réparer…" />

        <div className="row">
          <div><label>Début</label><input type="datetime-local" value={debut} onChange={(e) => setDebut(e.target.value)} /></div>
          <div><label>Fin</label><input type="datetime-local" value={fin} min={debut} onChange={(e) => setFin(e.target.value)} /></div>
        </div>
        <div className="row">
          <div><label>Coût (DT)</label><input type="number" min={0} step="0.01" value={cout} onChange={(e) => setCout(e.target.value)} /></div>
          <div>
            <label>Résultat</label>
            <select value={resultat} onChange={(e) => setResultat(e.target.value)}>
              <option value="">— Choisir —</option>
              {RESULTATS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </div>
  );
}
