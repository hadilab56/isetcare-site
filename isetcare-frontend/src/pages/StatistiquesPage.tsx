import { useEffect, useState } from 'react';
import { errorMessage } from '../api/client';
import { getStats } from '../api/stats';
import { ETAT_LABELS, STATUT_LABELS, type Stats } from '../api/types';
import BarList from '../components/BarList';
import ReplacementAdvisor from '../components/ReplacementAdvisor';
import { formatPrix } from '../utils/format';

/** US35 : tableau de bord statistique + US33/US34 : aide à la décision réparer / remplacer (IA). */
export default function StatistiquesPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getStats().then(setStats).catch((err) => setError(errorMessage(err)));
  }, []);

  const lignes = (m: Record<string, number>, labels: Record<string, string>) =>
    Object.entries(m).map(([k, v]) => ({ libelle: labels[k] ?? k, valeur: v }));

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Statistiques &amp; IA</h1>
          <p className="dashboard-subtitle">Indicateurs du parc et aide à la décision réparer / remplacer.</p>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {!stats && !error && <div className="spinner" />}

      {stats && (
        <>
          <div className="kpis">
            <div className="kpi"><strong>{stats.nbEquipements}</strong><span>Équipements</span></div>
            <div className="kpi"><strong>{stats.tauxDisponibilite} %</strong><span>Disponibilité</span></div>
            <div className="kpi"><strong>{stats.reclamationsOuvertes}</strong><span>Réclamations ouvertes</span></div>
            <div className="kpi"><strong>{stats.maintenancesEnRetard}</strong><span>Maintenances en retard</span></div>
            <div className="kpi"><strong>{formatPrix(stats.coutTotal)}</strong><span>Coût des réparations</span></div>
            <div className="kpi">
              <strong>{stats.delaiMoyenResolutionHeures ?? '—'}{stats.delaiMoyenResolutionHeures !== null ? ' h' : ''}</strong>
              <span>Délai moyen de résolution</span>
            </div>
          </div>

          <div className="profile-grid" style={{ marginTop: '1.5rem' }}>
            <div className="card">
              <h3>Équipements par état</h3>
              <BarList lignes={lignes(stats.equipementsParEtat, ETAT_LABELS)} />
            </div>
            <div className="card">
              <h3>Réclamations par statut</h3>
              <BarList lignes={lignes(stats.reclamationsParStatut, STATUT_LABELS)} />
            </div>
            <div className="card">
              <h3>Pannes par type d'équipement</h3>
              <BarList lignes={stats.pannesParType} />
            </div>
            <div className="card">
              <h3>Coût des réparations par type</h3>
              <BarList lignes={stats.coutsParType} unite=" DT" />
            </div>
          </div>
        </>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <ReplacementAdvisor />
      </div>
    </div>
  );
}
