import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { getHistorique } from '../api/suivi';
import type { Historique } from '../api/types';
import { formatDateTime, formatPrix } from '../utils/format';
import InterventionList from './InterventionList';
import { PrioriteBadge, StatutBadge } from './ReclamationBadges';

/** US09 / US20 : historique des pannes et interventions d'un équipement, avec le coût cumulé (admin et technicien). */
export default function HistoriquePanel({ equipementId }: { equipementId: number }) {
  const [h, setH] = useState<Historique | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getHistorique(equipementId)
      .then((data) => { if (!cancelled) setH(data); })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)); });
    return () => { cancelled = true; };
  }, [equipementId]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!h) return <p className="muted">Chargement de l'historique…</p>;

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h3>Historique des pannes et interventions</h3>
      <div className="kpis">
        <div className="kpi"><strong>{h.nbPannes}</strong><span>Réclamation(s)</span></div>
        <div className="kpi"><strong>{h.nbInterventions}</strong><span>Intervention(s)</span></div>
        <div className="kpi"><strong>{formatPrix(h.coutCumule)}</strong><span>Coût cumulé des réparations</span></div>
        <div className="kpi"><strong>{h.dureeIndisponibiliteJours} j</strong><span>Indisponibilité estimée</span></div>
      </div>

      <h3 className="section-title">Réclamations</h3>
      {h.reclamations.length === 0 ? <p className="muted">Aucune réclamation.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>N°</th><th>Date</th><th>Description</th><th>Priorité</th><th>Statut</th></tr></thead>
            <tbody>
              {h.reclamations.map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/reclamations/${r.id}`}>#{r.id}</Link></td>
                  <td>{formatDateTime(r.dateCreation)}</td>
                  <td className="desc">{r.description}</td>
                  <td><PrioriteBadge priorite={r.priorite} /></td>
                  <td><StatutBadge statut={r.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="section-title">Interventions</h3>
      <InterventionList items={h.interventions} />
    </div>
  );
}
