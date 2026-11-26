import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  
  CheckCircle2,
  Clock,
  PlusCircle,
  ArrowRight,
  Search,
  Laptop,
  Wrench } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import api, { errorMessage } from '../api/client';
import {
  PRIORITE_LABELS,
  STATUT_LABELS,
  type Reclamation,
  type StatutReclamation,
} from '../api/types';
import { formatDateTime } from '../utils/format';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reclamations, setReclamations] = useState<Reclamation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api
      .get<Reclamation[]>('/reclamations')
      .then((res) => setReclamations(res.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  // Calcul dynamique des compteurs
  const enCours = reclamations.filter((r) =>
    ['NOUVEAU', 'AFFECTEE', 'EN_COURS'].includes(r.statut)
  ).length;

  const resolues = reclamations.filter((r) =>
    ['RESOLU', 'CLOTURE'].includes(r.statut)
  ).length;

  // Filtrage rapide sur le tableau récent
  const dernieresReclamations = reclamations
    .filter(
      (r) =>
        r.equipementReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice(0, 5);

  const getStatutBadgeClass = (statut: StatutReclamation) => {
    switch (statut) {
      case 'NOUVEAU':
        return 'badge badge-blue';
      case 'AFFECTEE':
      case 'EN_COURS':
        return 'badge badge-amber';
      case 'RESOLU':
      case 'CLOTURE':
        return 'badge badge-green';
      default:
        return 'badge';
    }
  };

  return (
    <div className="dashboard-container">
      {/* En-tête moderne avec action rapide */}
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Bonjour, {user?.prenom} 👋</h1>
          <p className="dashboard-subtitle">
            {user?.departement ? `Département ${user.departement} • ` : ''}
            Bienvenue sur votre espace de suivi matériel ISETCare
          </p>
        </div>

        {user?.role === 'DECLARANT' && (
          <Link to="/reclamations/nouvelle" className="btn-primary-pro">
            <PlusCircle size={18} />
            <span>Signaler une panne</span>
          </Link>
        )}
      </header>

      {error && <div className="alert-error">{error}</div>}

      {/* Grille des KPIs interactifs */}
      <section className="kpi-grid">
        <div
          className="kpi-card kpi-amber"
          onClick={() => navigate('/reclamations')}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-icon-wrapper amber">
            <Clock size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{loading ? '—' : enCours}</span>
            <span className="kpi-label">Réclamations en cours</span>
            <span className="kpi-hint">En attente ou en cours de réparation</span>
          </div>
          <ArrowRight className="kpi-arrow" size={18} />
        </div>

        <div
          className="kpi-card kpi-green"
          onClick={() => navigate('/reclamations')}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-icon-wrapper green">
            <CheckCircle2 size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{loading ? '—' : resolues}</span>
            <span className="kpi-label">Résolues ou clôturées</span>
            <span className="kpi-hint">Interventions terminées avec succès</span>
          </div>
          <ArrowRight className="kpi-arrow" size={18} />
        </div>

        <div
          className="kpi-card kpi-blue"
          onClick={() => navigate('/equipements')}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-icon-wrapper blue">
            <Laptop size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">Parc</span>
            <span className="kpi-label">Consulter le matériel</span>
            <span className="kpi-hint">Équipements & QR Codes par salle</span>
          </div>
          <ArrowRight className="kpi-arrow" size={18} />
        </div>
      </section>

      {/* Section interactive : Dernières réclamations */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h2>Activité récente</h2>
            <p className="panel-sub">Suivez l'avancement de vos derniers signalements</p>
          </div>

          <div className="panel-actions">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Filtrer par référence ou panne..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Link to="/reclamations" className="btn-ghost">
              Tout voir <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Chargement de vos données...</div>
        ) : dernieresReclamations.length === 0 ? (
          <div className="empty-state">
            <Wrench size={36} className="empty-icon" />
            <h3>Aucune réclamation trouvée</h3>
            <p>Aucun résultat pour ces critères.</p>
            {user?.role === 'DECLARANT' && (
              <Link to="/reclamations/nouvelle" className="btn-secondary-pro">
                Créer mon premier signalement
              </Link>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>Équipement</th>
                  <th>Description</th>
                  <th>Salle</th>
                  <th>Priorité</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {dernieresReclamations.map((rec) => (
                  <tr
                    key={rec.id}
                    onClick={() => navigate(`/reclamations/${rec.id}`)}
                    className="clickable-row"
                  >
                    <td>
                      <strong className="ref-tag">{rec.equipementReference}</strong>
                      <div className="sub-text">{rec.equipementLibelle}</div>
                    </td>
                    <td className="desc-cell">{rec.description}</td>
                    <td>{rec.salleNom ?? '—'}</td>
                    <td>
                      <span className={`prio-dot prio-${rec.priorite.toLowerCase()}`}>
                        {PRIORITE_LABELS[rec.priorite]}
                      </span>
                    </td>
                    <td>
                      <span className={getStatutBadgeClass(rec.statut)}>
                        {STATUT_LABELS[rec.statut]}
                      </span>
                    </td>
                    <td className="date-cell">{formatDateTime(rec.dateCreation)}</td>
                    <td className="action-cell">
                      <ArrowRight size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}