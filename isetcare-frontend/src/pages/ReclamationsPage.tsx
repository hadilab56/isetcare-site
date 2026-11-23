import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  
  PlusCircle,
  Search,
  
  ArrowRight,
  
  
  Wrench } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  STATUT_LABELS,
  PRIORITE_LABELS,
  STATUTS,
  PRIORITES,
  type Reclamation,
  type StatutReclamation } from '../api/types';
import { formatDateTime } from '../utils/format';

export default function ReclamationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reclamations, setReclamations] = useState<Reclamation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres de recherche
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('');
  const [selectedPriorite, setSelectedPriorite] = useState<string>('');

  const fetchReclamations = () => {
    setLoading(true);
    api
      .get<Reclamation[]>('/reclamations')
      .then((res) => setReclamations(res.data))
      .catch((err) => setError(errorMessage(err, 'Impossible de charger les réclamations.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReclamations();
  }, []);

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

  // Filtrage dynamique des réclamations
  const filteredReclamations = reclamations.filter((rec) => {
    const matchSearch =
      rec.equipementReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.salleNom && rec.salleNom.toLowerCase().includes(searchTerm.toLowerCase())) ||
      rec.declarantNom.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatut = selectedStatut ? rec.statut === selectedStatut : true;
    const matchPriorite = selectedPriorite ? rec.priorite === selectedPriorite : true;

    return matchSearch && matchStatut && matchPriorite;
  });

  return (
    <div className="dashboard-container">
      {/* En-tête de la page */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            {user?.role === 'DECLARANT' ? 'Mes réclamations' : 'Gestion des réclamations'}
          </h1>
          <p className="dashboard-subtitle">
            Suivez l'état des pannes signalées et leur prise en charge technique.
          </p>
        </div>

        {user?.role === 'DECLARANT' && (
          <Link to="/reclamations/nouvelle" className="btn-primary-pro">
            <PlusCircle size={18} />
            <span>Signaler une panne</span>
          </Link>
        )}
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Barre de filtres et recherche */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Recherche */}
          <div className="search-box" style={{ flex: '1', minWidth: '260px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher par référence, salle, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {/* Filtres par statut et priorité */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              style={{ width: 'auto', minWidth: '150px' }}
            >
              <option value="">Tous les statuts</option>
              {STATUTS.map((st) => (
                <option key={st} value={st}>
                  {STATUT_LABELS[st]}
                </option>
              ))}
            </select>

            <select
              value={selectedPriorite}
              onChange={(e) => setSelectedPriorite(e.target.value)}
              style={{ width: 'auto', minWidth: '150px' }}
            >
              <option value="">Toutes les priorités</option>
              {PRIORITES.map((pr) => (
                <option key={pr} value={pr}>
                  {PRIORITE_LABELS[pr]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des réclamations */}
      <div className="panel-card">
        <div className="panel-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h2>Liste des signalements</h2>
            <p className="panel-sub">
              {filteredReclamations.length} réclamation(s) trouvée(s)
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Chargement des réclamations...</div>
        ) : filteredReclamations.length === 0 ? (
          <div className="empty-state">
            <Wrench size={36} className="empty-icon" />
            <h3>Aucune réclamation ne correspond à vos critères</h3>
            <p>Essayez de modifier vos filtres de recherche.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>Équipement</th>
                  <th>Description</th>
                  <th>Salle</th>
                  <th>Déclarant</th>
                  <th>Priorité</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredReclamations.map((rec) => (
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
                    <td>{rec.declarantNom}</td>
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
                    <td className="date-cell" style={{ fontSize: '0.85rem' }}>
                      {formatDateTime(rec.dateCreation)}
                    </td>
                    <td className="action-cell">
                      <ArrowRight size={16} color="#94a3b8" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}