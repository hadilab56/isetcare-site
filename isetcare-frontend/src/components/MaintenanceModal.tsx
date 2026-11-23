import { useState, type FormEvent } from 'react';
import { errorMessage } from '../api/client';
import {
  annulerMaintenance, modifierMaintenance, planifierMaintenance, realiserMaintenance,
} from '../api/maintenances';
import { STATUT_MAINT_LABELS, type Equipement, type Maintenance, type Role, type User } from '../api/types';
import { formatDate, isoDate } from '../utils/format';
import EquipementPicker from './EquipementPicker';

interface Props {
  maintenance: Maintenance | null; // null = planification d'une nouvelle maintenance
  role: Role;
  techniciens: User[];
  onClose: () => void;
  onChanged: () => void; // la liste doit être rechargée
}

type Mode = 'voir' | 'editer' | 'realiser';

/**
 * Fenêtre unique pour une maintenance :
 * - administrateur : planifier (US22), replanifier, annuler ;
 * - technicien : réaliser et saisir son rapport (US23). La prochaine échéance est créée par le serveur (US25).
 */
export default function MaintenanceModal({ maintenance, role, techniciens, onClose, onChanged }: Props) {
  const [mode, setMode] = useState<Mode>(maintenance ? 'voir' : 'editer');
  const [equipement, setEquipement] = useState<Equipement | null>(null);
  const [technicienId, setTechnicienId] = useState(maintenance?.technicienId ? String(maintenance.technicienId) : '');
  const [date, setDate] = useState(maintenance?.datePlanifiee ?? '');
  const [rapport, setRapport] = useState('');
  const [dateReal, setDateReal] = useState(isoDate(new Date()));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isAdmin = role === 'ADMINISTRATEUR';
  const ouverte = maintenance !== null && (maintenance.statut === 'PLANIFIEE' || maintenance.statut === 'EN_RETARD');

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const submitEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!maintenance && !equipement) return setError("Choisissez l'équipement.");
    if (!technicienId) return setError('Choisissez un technicien.');
    if (!date) return setError('Choisissez une date.');
    if (date < isoDate(new Date())) return setError("La date doit être aujourd'hui ou dans le futur.");
    const input = { equipementId: maintenance ? maintenance.equipementId : (equipement as Equipement).id, technicienId: Number(technicienId), datePlanifiee: date };
    void run(() => (maintenance ? modifierMaintenance(maintenance.id, input) : planifierMaintenance(input)));
  };

  const submitRealiser = (e: FormEvent) => {
    e.preventDefault();
    if (!maintenance) return;
    if (!rapport.trim()) return setError('Le rapport est obligatoire.');
    void run(() => realiserMaintenance(maintenance.id, rapport.trim(), dateReal || null));
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal card wide" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{maintenance ? `Maintenance — ${maintenance.equipementReference}` : 'Planifier une maintenance'}</h3>
        {error && <div className="alert alert-error">{error}</div>}

        {maintenance && mode === 'voir' && (
          <>
            <dl className="detail-grid">
              <div><dt>Équipement</dt><dd>{maintenance.equipementReference} {maintenance.equipementLibelle}</dd></div>
              <div><dt>Salle</dt><dd>{maintenance.salleNom ?? '—'}</dd></div>
              <div><dt>Statut</dt><dd><span className={`badge maint-${maintenance.statut}`}>{STATUT_MAINT_LABELS[maintenance.statut]}</span></dd></div>
              <div><dt>Date prévue</dt><dd>{formatDate(maintenance.datePlanifiee)}</dd></div>
              <div><dt>Technicien</dt><dd>{maintenance.technicienNom ?? '—'}</dd></div>
              <div><dt>Fréquence</dt><dd>{maintenance.frequenceMois ? `Tous les ${maintenance.frequenceMois} mois` : '—'}</dd></div>
              {maintenance.dateRealisation && <div><dt>Réalisée le</dt><dd>{formatDate(maintenance.dateRealisation)}</dd></div>}
            </dl>
            {maintenance.rapport && (<><h3 className="section-title">Rapport</h3><p className="prewrap">{maintenance.rapport}</p></>)}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={onClose}>Fermer</button>
              {isAdmin && ouverte && (
                <>
                  <button className="btn btn-outline" disabled={busy}
                    onClick={() => { if (window.confirm('Annuler cette maintenance ?')) void run(() => annulerMaintenance(maintenance.id)); }}>
                    Annuler la maintenance
                  </button>
                  <button className="btn btn-primary" onClick={() => setMode('editer')}>Replanifier</button>
                </>
              )}
              {!isAdmin && ouverte && <button className="btn btn-primary" onClick={() => setMode('realiser')}>Réaliser</button>}
            </div>
          </>
        )}

        {mode === 'editer' && (
          <form onSubmit={submitEdit}>
            {!maintenance && (<><label>Équipement</label><EquipementPicker value={equipement} onChange={setEquipement} /></>)}
            <div className="row">
              <div>
                <label htmlFor="mt">Technicien</label>
                <select id="mt" value={technicienId} onChange={(e) => setTechnicienId(e.target.value)}>
                  <option value="">— Choisir —</option>
                  {techniciens.map((t) => <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="md">Date prévue</label>
                <input id="md" type="date" min={isoDate(new Date())} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={maintenance ? () => setMode('voir') : onClose}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </form>
        )}

        {mode === 'realiser' && (
          <form onSubmit={submitRealiser}>
            <label htmlFor="mr">Rapport de maintenance</label>
            <textarea id="mr" rows={5} required value={rapport} onChange={(e) => setRapport(e.target.value)}
              placeholder="Opérations effectuées, pièces vérifiées, observations…" />
            <label htmlFor="mdr">Date de réalisation</label>
            <input id="mdr" type="date" max={isoDate(new Date())} value={dateReal} onChange={(e) => setDateReal(e.target.value)} />
            <p className="muted small">La prochaine maintenance sera planifiée automatiquement selon la fréquence du type d'équipement.</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setMode('voir')}>Retour</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Terminer la maintenance'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
