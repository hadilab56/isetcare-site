import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building,
  
  X } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  STATUT_MAINT_LABELS,
  STATUTS_MAINT,
  type Maintenance,
  type StatutMaintenance,
  type Equipement,
  type User,
} from '../api/types';
import { formatDate } from '../utils/format';

export default function MaintenancesPage() {
  const { user } = useAuth();
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [equipements, setEquipements] = useState<Equipement[]>([]);
  const [techniciens, setTechniciens] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatut, setSelectedStatut] = useState('');

  // Formulaire de planification rapide (Admin)
  const [showForm, setShowForm] = useState(false);
  const [equipementId, setEquipementId] = useState('');
  const [technicienId, setTechnicienId] = useState('');
  const [datePlanifiee, setDatePlanifiee] = useState('');
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'ADMINISTRATEUR';
  const isTechOrAdmin = user?.role === 'TECHNICIEN' || isAdmin;

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get<Maintenance[]>('/maintenances'),
      isAdmin ? api.get<Equipement[]>('/equipements').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      isAdmin ? api.get<User[]>('/utilisateurs').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ])
      .then(([mRes, eRes, uRes]) => {
        setMaintenances(mRes.data);
        setEquipements(eRes.data);
        setTechniciens(uRes.data.filter((u) => u.role === 'TECHNICIEN' && u.actif));
      })
      .catch((err) => setError(errorMessage(err, 'Impossible de charger les maintenances.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePlanifier = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/maintenances', {
        equipementId: Number(equipementId),
        technicienId: Number(technicienId),
        datePlanifiee,
      });
      setShowForm(false);
      setEquipementId('');
      setTechnicienId('');
      setDatePlanifiee('');
      fetchData();
    } catch (err) {
      setError(errorMessage(err, 'Erreur lors de la planification.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRealiser = async (id: number) => {
    const rapport = window.prompt('Saisissez un bref rapport de contrôle préventif :');
    if (rapport === null) return;
    try {
      await api.patch(`/maintenances/${id}/realiser`, { rapport });
      fetchData();
    } catch (err) {
      setError(errorMessage(err, 'Impossible de valider la maintenance.'));
    }
  };

  const getBadgeClass = (statut: StatutMaintenance) => {
    switch (statut) {
      case 'PLANIFIEE':
        return 'badge badge-blue';
      case 'EN_RETARD':
        return 'badge badge-red';
      case 'REALISEE':
        return 'badge badge-green';
      default:
        return 'badge';
    }
  };

  const filtered = useMemo(() => {
    return maintenances.filter((m) => {
      const matchSearch =
        m.equipementReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.equipementLibelle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.salleNom && m.salleNom.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.technicienNom && m.technicienNom.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatut = selectedStatut ? m.statut === selectedStatut : true;
      return matchSearch && matchStatut;
    });
  }, [maintenances, searchTerm, selectedStatut]);

  const nbRetard = maintenances.filter((m) => m.statut === 'EN_RETARD').length;
  const nbPlanifiees = maintenances.filter((m) => m.statut === 'PLANIFIEE').length;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Maintenance préventive</h1>
          <p className="dashboard-subtitle">
            Planification périodique et contrôle préventif du parc matériel.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="btn-primary-pro"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <X size={18} /> : <PlusCircle size={18} />}
            <span>{showForm ? 'Fermer le formulaire' : 'Planifier une maintenance'}</span>
          </button>
        )}
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Formulaire de planification rapide */}
      {showForm && isAdmin && (
        <form onSubmit={handlePlanifier} className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ marginBottom: '1rem' }}>Nouvelle maintenance préventive</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Équipement</label>
              <select value={equipementId} onChange={(e) => setEquipementId(e.target.value)} required>
                <option value="">-- Choisir un équipement --</option>
                {equipements.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.reference} — {eq.marque} {eq.modele} ({eq.salleNom ?? 'Sans salle'})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Technicien affecté</label>
              <select value={technicienId} onChange={(e) => setTechnicienId(e.target.value)} required>
                <option value="">-- Choisir un technicien --</option>
                {techniciens.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.prenom} {t.nom} {t.specialite ? `(${t.specialite})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Date prévue</label>
              <input
                type="date"
                value={datePlanifiee}
                onChange={(e) => setDatePlanifiee(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Planification...' : 'Confirmer la planification'}
            </button>
          </div>
        </form>
      )}

      {/* KPIs rapides */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-blue" onClick={() => setSelectedStatut('PLANIFIEE')}>
          <div className="kpi-icon-wrapper blue"><Clock size={22} /></div>
          <div className="kpi-content">
            <span className="kpi-value">{nbPlanifiees}</span>
            <span className="kpi-label">Maintenances planifiées</span>
          </div>
        </div>
        <div className="kpi-card kpi-amber" onClick={() => setSelectedStatut('EN_RETARD')}>
          <div className="kpi-icon-wrapper amber"><AlertTriangle size={22} /></div>
          <div className="kpi-content">
            <span className="kpi-value">{nbRetard}</span>
            <span className="kpi-label">En retard</span>
          </div>
        </div>
      </div>

      {/* Filtres + Tableau */}
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <h2>Calendrier des opérations</h2>
            <p className="panel-sub">{filtered.length} opération(s) affichée(s)</p>
          </div>
          <div className="panel-actions">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Équipement, salle, technicien..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="">Tous les statuts</option>
              {STATUTS_MAINT.map((st) => (
                <option key={st} value={st}>{STATUT_MAINT_LABELS[st]}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <CalendarClock size={36} className="empty-icon" />
            <h3>Aucune maintenance trouvée</h3>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>Équipement</th>
                  <th>Salle</th>
                  <th>Technicien</th>
                  <th>Date prévue</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link to={`/equipements/${m.equipementId}`} className="ref-tag" style={{ fontWeight: 700, textDecoration: 'none' }}>
                        {m.equipementReference}
                      </Link>
                      <div className="sub-text">{m.equipementLibelle}</div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Building size={14} color="#64748b" /> {m.salleNom ?? '—'}
                      </span>
                    </td>
                    <td>{m.technicienNom ?? 'Non assigné'}</td>
                    <td><strong>{formatDate(m.datePlanifiee)}</strong></td>
                    <td>
                      <span className={getBadgeClass(m.statut)}>
                        {STATUT_MAINT_LABELS[m.statut]}
                      </span>
                    </td>
                    <td>
                      {isTechOrAdmin && (m.statut === 'PLANIFIEE' || m.statut === 'EN_RETARD') ? (
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
                          onClick={() => handleRealiser(m.id)}
                        >
                          <CheckCircle2 size={14} /> Clôturer
                        </button>
                      ) : (
                        <span className="sub-text">{m.rapport ? 'Rapport enregistré' : '—'}</span>
                      )}
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