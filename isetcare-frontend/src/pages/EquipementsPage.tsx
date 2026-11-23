import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Laptop,
  PlusCircle,
  Search,
  
  ArrowRight,
  
  Building,
  
  SlidersHorizontal } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  ETAT_LABELS,
  ETATS,
  type Equipement,
  type EtatEquipement,
  type Salle,
  type TypeEquipement } from '../api/types';
import { formatPrix } from '../utils/format';

export default function EquipementsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [equipements, setEquipements] = useState<Equipement[]>([]);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [types, setTypes] = useState<TypeEquipement[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres interactifs
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedSalle, setSelectedSalle] = useState<string>('');
  const [selectedEtat, setSelectedEtat] = useState<string>('');

  const isAdmin = user?.role === 'ADMINISTRATEUR';

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Equipement[]>('/equipements'),
      api.get<Salle[]>('/salles').catch(() => ({ data: [] })),
      api.get<TypeEquipement[]>('/types').catch(() => ({ data: [] })),
    ])
      .then(([eqRes, salleRes, typeRes]) => {
        setEquipements(eqRes.data);
        setSalles(salleRes.data);
        setTypes(typeRes.data);
      })
      .catch((err) => setError(errorMessage(err, 'Impossible de charger le parc matériel.')))
      .finally(() => setLoading(false));
  }, []);

  const getEtatBadgeClass = (etat: EtatEquipement) => {
    switch (etat) {
      case 'EN_SERVICE':
        return 'badge badge-green';
      case 'EN_PANNE':
        return 'badge badge-red';
      case 'EN_MAINTENANCE':
        return 'badge badge-amber';
      case 'HORS_SERVICE':
        return 'badge';
      default:
        return 'badge';
    }
  };

  // Filtrage intelligent et instantané
  const filteredEquipements = useMemo(() => {
    return equipements.filter((eq) => {
      const matchSearch =
        eq.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (eq.marque && eq.marque.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (eq.modele && eq.modele.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (eq.numeroSerie && eq.numeroSerie.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType = selectedType ? eq.typeId?.toString() === selectedType : true;
      const matchSalle = selectedSalle ? eq.salleId?.toString() === selectedSalle : true;
      const matchEtat = selectedEtat ? eq.etat === selectedEtat : true;

      return matchSearch && matchType && matchSalle && matchEtat;
    });
  }, [equipements, searchTerm, selectedType, selectedSalle, selectedEtat]);

  return (
    <div className="dashboard-container">
      {/* En-tête de la page */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Parc Matériel</h1>
          <p className="dashboard-subtitle">
            Gestion centralisée des équipements informatiques, salles et QR codes.
          </p>
        </div>

        {isAdmin && (
          <Link to="/equipements/nouveau" className="btn-primary-pro">
            <PlusCircle size={18} />
            <span>Ajouter un équipement</span>
          </Link>
        )}
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Barre de filtres moderne et compacte (Grille horizontale) */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', color: '#0f3d68', fontWeight: 600, fontSize: '0.9rem' }}>
          <SlidersHorizontal size={16} />
          <span>Filtres & Recherche instantanée</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
          {/* Recherche textuelle */}
          <div className="search-box" style={{ width: '100%' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Réf, marque, modèle, n° série..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {/* Filtre Type */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">Tous les types</option>
            {types.map((t) => (
              <option key={t.id} value={t.id.toString()}>
                {t.libelle}
              </option>
            ))}
          </select>

          {/* Filtre Salle */}
          <select
            value={selectedSalle}
            onChange={(e) => setSelectedSalle(e.target.value)}
          >
            <option value="">Toutes les salles</option>
            {salles.map((s) => (
              <option key={s.id} value={s.id.toString()}>
                {s.nom} {s.batiment ? `(${s.batiment})` : ''}
              </option>
            ))}
          </select>

          {/* Filtre État */}
          <select
            value={selectedEtat}
            onChange={(e) => setSelectedEtat(e.target.value)}
          >
            <option value="">Tous les états</option>
            {ETATS.map((et) => (
              <option key={et} value={et}>
                {ETAT_LABELS[et]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau interactif des équipements */}
      <div className="panel-card">
        <div className="panel-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h2>Équipements répertoriés</h2>
            <p className="panel-sub">
              Affichage de <strong style={{ color: '#0f3d68' }}>{filteredEquipements.length}</strong> équipement(s) sur {equipements.length} au total
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Chargement du parc matériel...</div>
        ) : filteredEquipements.length === 0 ? (
          <div className="empty-state">
            <Laptop size={36} className="empty-icon" />
            <h3>Aucun équipement trouvé</h3>
            <p>Modifiez vos critères de recherche ou réinitialisez les filtres.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Type</th>
                  <th>Marque / Modèle</th>
                  <th>Salle</th>
                  <th>État</th>
                  <th>Prix d'achat</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipements.map((eq) => (
                  <tr
                    key={eq.id}
                    onClick={() => navigate(`/equipements/${eq.id}`)}
                    className="clickable-row"
                  >
                    <td>
                      <strong className="ref-tag">{eq.reference}</strong>
                    </td>
                    <td>{eq.typeLibelle ?? '—'}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {eq.marque} {eq.modele}
                      </div>
                      {eq.numeroSerie && (
                        <div className="sub-text" style={{ fontFamily: 'monospace' }}>
                          S/N: {eq.numeroSerie}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Building size={14} color="#64748b" />
                        <span>{eq.salleNom ?? 'Non assignée'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={getEtatBadgeClass(eq.etat)}>
                        {ETAT_LABELS[eq.etat]}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{formatPrix(eq.prixAchat)}</td>
                    <td className="action-cell" style={{ textAlign: 'right' }}>
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