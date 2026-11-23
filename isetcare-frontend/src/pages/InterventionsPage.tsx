import { useEffect, useState, useMemo } from 'react';
import {  useNavigate } from 'react-router-dom';
import {
  Wrench,
  Search,
  
  DollarSign,
  
  User,
  ArrowRight } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import type { Intervention } from '../api/types';
import {  formatPrix } from '../utils/format';

export default function InterventionsPage() {
  const navigate = useNavigate();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get<Intervention[]>('/interventions')
      .then((res) => setInterventions(res.data))
      .catch((err) =>
        setError(errorMessage(err, 'Impossible de charger les interventions.'))
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return interventions.filter(
      (i) =>
        i.equipementReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.diagnostic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.actionEffectuee &&
          i.actionEffectuee.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (i.technicienNom &&
          i.technicienNom.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [interventions, searchTerm]);

  const coutTotal = useMemo(
    () => interventions.reduce((sum, i) => sum + (i.cout ?? 0), 0),
    [interventions]
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Interventions techniques</h1>
          <p className="dashboard-subtitle">
            Historique des diagnostics, réparations effectuées et coûts associés.
          </p>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* KPIs rapides */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-blue">
          <div className="kpi-icon-wrapper blue">
            <Wrench size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{interventions.length}</span>
            <span className="kpi-label">Interventions enregistrées</span>
          </div>
        </div>

        <div className="kpi-card kpi-green">
          <div className="kpi-icon-wrapper green">
            <DollarSign size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{formatPrix(coutTotal)}</span>
            <span className="kpi-label">Coût cumulé des réparations</span>
          </div>
        </div>
      </div>

      {/* Tableau des interventions */}
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <h2>Journal des interventions</h2>
            <p className="panel-sub">{filtered.length} intervention(s) affichée(s)</p>
          </div>

          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Réf. équipement, diagnostic, technicien..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Chargement des interventions...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Wrench size={36} className="empty-icon" />
            <h3>Aucune intervention trouvée</h3>
            <p>Les interventions apparaissent ici lorsqu'un technicien traite une réclamation.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>Équipement</th>
                  <th>Diagnostic & Action</th>
                  <th>Technicien</th>
                  <th>Durée</th>
                  <th>Coût</th>
                  <th>Résultat</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/reclamations/${item.reclamationId}`)}
                    className="clickable-row"
                  >
                    <td>
                      <strong className="ref-tag">{item.equipementReference}</strong>
                      <div className="sub-text">Ticket #{item.reclamationId}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {item.diagnostic}
                      </div>
                      {item.actionEffectuee && (
                        <div className="sub-text">{item.actionEffectuee}</div>
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <User size={14} color="#64748b" />
                        {item.technicienNom ?? '—'}
                      </span>
                    </td>
                    <td>
                      {item.dureeMinutes !== null ? `${item.dureeMinutes} min` : '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {item.cout !== null ? formatPrix(item.cout) : '0 DT'}
                    </td>
                    <td>
                      {item.resultat ? (
                        <span className="badge badge-green">{item.resultat}</span>
                      ) : (
                        <span className="badge badge-amber">En cours</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
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