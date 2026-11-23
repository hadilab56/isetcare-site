import { useEffect, useState } from 'react';
import { errorMessage } from '../api/client';
import { listEquipements } from '../api/materiel';
import { recommendReplacement } from '../api/ai';
import { getHistorique, listDecisions, saveDecision } from '../api/suivi';
import {
  DECISION_LABELS, type AiDecision, type AiRecommendation, type Decision, type DecisionRecord, type Equipement, type Historique,
} from '../api/types';
import { formatDate, formatPrix } from '../utils/format';

const AI_LABELS: Record<AiDecision, string> = { REPARER: 'Réparer', SURVEILLER: 'Surveiller', REMPLACER: 'Remplacer' };

/** Règle simple de repli, calculée dans le navigateur à partir de l'historique (utilisée même si l'IA est arrêtée). */
function estimationLocale(h: Historique): { decision: AiDecision; raisons: string[] } {
  const ratio = h.prixAchat && h.prixAchat > 0 ? h.coutCumule / h.prixAchat : null;
  const raisons: string[] = [`${h.nbPannes} panne(s) enregistrée(s)`];
  if (ratio !== null) raisons.push(`Les réparations ont coûté ${Math.round(ratio * 100)} % du prix d'achat`);
  if ((ratio !== null && ratio >= 0.6) || h.nbPannes >= 5) return { decision: 'REMPLACER', raisons };
  if ((ratio !== null && ratio >= 0.35) || h.nbPannes >= 3) return { decision: 'SURVEILLER', raisons };
  return { decision: 'REPARER', raisons };
}

/** US33 / US34 : aide à la décision réparer ou remplacer, et enregistrement de la décision de l'administrateur. */
export default function ReplacementAdvisor() {
  const [equipements, setEquipements] = useState<Equipement[]>([]);
  const [equipementId, setEquipementId] = useState('');
  const [h, setH] = useState<Historique | null>(null);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [ia, setIa] = useState<AiRecommendation | null>(null);
  const [iaError, setIaError] = useState('');
  const [iaLoading, setIaLoading] = useState(false);
  const [coutRemplacement, setCoutRemplacement] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listEquipements().then(setEquipements).catch((err) => setError(errorMessage(err)));
  }, []);

  useEffect(() => {
    setH(null); setIa(null); setIaError(''); setOk(''); setError('');
    if (!equipementId) { setDecisions([]); return; }
    let cancelled = false;
    const id = Number(equipementId);
    Promise.all([getHistorique(id), listDecisions(id)])
      .then(([hist, dec]) => {
        if (cancelled) return;
        setH(hist);
        setDecisions(dec);
        setCoutRemplacement(hist.prixAchat !== null ? String(hist.prixAchat) : '');
      })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)); });
    return () => { cancelled = true; };
  }, [equipementId]);

  const askIa = async () => {
    setIaError(''); setIaLoading(true);
    try {
      setIa(await recommendReplacement(Number(equipementId)));
    } catch (err) {
      setIaError(`${errorMessage(err, "Le service d'IA est indisponible.")} L'estimation locale reste disponible.`);
    } finally {
      setIaLoading(false);
    }
  };

  const decider = async (decision: Decision) => {
    if (!h) return;
    if (coutRemplacement !== '' && (!Number.isFinite(Number(coutRemplacement)) || Number(coutRemplacement) < 0))
      return setError('Le coût de remplacement doit être un nombre positif ou nul.');
    setBusy(true); setError(''); setOk('');
    try {
      const saved = await saveDecision(h.equipementId, decision, coutRemplacement === '' ? null : Number(coutRemplacement));
      setDecisions((d) => [saved, ...d]);
      setOk(`Décision enregistrée : ${DECISION_LABELS[decision]}.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const local = h ? estimationLocale(h) : null;
  const ratio = h && h.prixAchat && h.prixAchat > 0 ? h.coutCumule / h.prixAchat : null;

  return (
    <div className="card">
      <h3>Aide à la décision : réparer ou remplacer ?</h3>
      <label htmlFor="adv">Équipement</label>
      <select id="adv" value={equipementId} onChange={(e) => setEquipementId(e.target.value)}>
        <option value="">— Choisir un équipement —</option>
        {equipements.map((e) => <option key={e.id} value={e.id}>{e.reference} {[e.marque, e.modele].filter(Boolean).join(' ')}</option>)}
      </select>

      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}

      {h && local && (
        <>
          <div className="kpis">
            <div className="kpi"><strong>{h.nbPannes}</strong><span>Pannes</span></div>
            <div className="kpi"><strong>{h.nbInterventions}</strong><span>Interventions</span></div>
            <div className="kpi"><strong>{formatPrix(h.coutCumule)}</strong><span>Coût cumulé</span></div>
            <div className="kpi"><strong>{formatPrix(h.prixAchat)}</strong><span>Prix d'achat</span></div>
            <div className="kpi"><strong>{ratio === null ? '—' : `${Math.round(ratio * 100)} %`}</strong><span>Coût / prix d'achat</span></div>
            <div className="kpi"><strong>{h.dureeIndisponibiliteJours} j</strong><span>Indisponibilité</span></div>
          </div>

          <div className={`reco reco-${local.decision}`}>
            <strong>Estimation locale : {AI_LABELS[local.decision]}</strong>
            <ul>{local.raisons.map((r) => <li key={r}>{r}</li>)}</ul>
            <p className="muted small">Règle simple : remplacer si les réparations dépassent 60 % du prix d'achat ou 5 pannes ; surveiller à partir de 35 % ou 3 pannes.</p>
          </div>

          <div className="inline-actions">
            <button className="btn" disabled={iaLoading} onClick={() => void askIa()}>
              {iaLoading ? 'Analyse en cours…' : "Demander l'avis de l'IA"}
            </button>
          </div>
          {iaError && <div className="alert alert-warn">{iaError}</div>}
          {ia && (
            <div className={`reco reco-${ia.decision}`}>
              <strong>Avis de l'IA : {AI_LABELS[ia.decision] ?? ia.decision}</strong>
              <p>{ia.message}</p>
              <p className="muted small">Score : {ia.score} · Ratio de coût : {ia.ratioCout}</p>
              {ia.raisons?.length > 0 && <ul>{ia.raisons.map((r) => <li key={r}>{r}</li>)}</ul>}
            </div>
          )}

          <h3 className="section-title">Ma décision (la décision finale revient à l'administrateur)</h3>
          <div className="row">
            <div>
              <label htmlFor="cr">Coût de remplacement estimé (DT)</label>
              <input id="cr" type="number" min={0} step="0.01" value={coutRemplacement} onChange={(e) => setCoutRemplacement(e.target.value)} />
            </div>
            <div className="inline-actions end">
              <button className="btn" disabled={busy} onClick={() => void decider('REPARER')}>Je décide : réparer</button>
              <button className="btn btn-primary" disabled={busy} onClick={() => void decider('REMPLACER')}>Je décide : remplacer</button>
            </div>
          </div>

          {decisions.length > 0 && (
            <>
              <h3 className="section-title">Décisions précédentes</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Décision</th><th>Pannes</th><th>Coût cumulé</th><th>Remplacement estimé</th></tr></thead>
                  <tbody>
                    {decisions.map((d) => (
                      <tr key={d.id}>
                        <td>{d.dateAnalyse ? formatDate(d.dateAnalyse) : '—'}</td>
                        <td>{DECISION_LABELS[d.decision]}</td>
                        <td>{d.nbPannes ?? '—'}</td>
                        <td>{formatPrix(d.coutCumuleReparations)}</td>
                        <td>{formatPrix(d.coutRemplacementEstime)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
