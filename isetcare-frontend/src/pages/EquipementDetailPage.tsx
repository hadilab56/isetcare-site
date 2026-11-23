import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Laptop,
  Building,
  Tag,
  Calendar,
  DollarSign,
  QrCode,
  AlertCircle,
  
  
  ArrowLeft,
  Edit } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  ETAT_LABELS,
  type Equipement,
  type EtatEquipement,
  type Historique,
} from '../api/types';
import { formatPrix, formatDate } from '../utils/format';

export default function EquipementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [equipement, setEquipement] = useState<Equipement | null>(null);
  const [historique, setHistorique] = useState<Historique | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTechOrAdmin = user?.role === 'TECHNICIEN' || user?.role === 'ADMINISTRATEUR';

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    // Récupération en parallèle de l'équipement et de son historique (pannes/interventions)
    Promise.all([
      api.get<Equipement>(`/equipements/${id}`),
      api.get<Historique>(`/equipements/${id}/historique`).catch(() => null),
    ])
      .then(([eqRes, histRes]) => {
        setEquipement(eqRes.data);
        if (histRes) setHistorique(histRes.data);
      })
      .catch((err) => setError(errorMessage(err, "Impossible de charger la fiche de l'équipement.")))
      .finally(() => setLoading(false));
  }, [id]);

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

  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !equipement) {
    return (
      <div className="dashboard-container">
        <p>
          <Link to="/equipements" className="btn-ghost">
            <ArrowLeft size={16} /> Retour au parc matériel
          </Link>
        </p>
        <div className="alert-error">{error ?? 'Équipement introuvable.'}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* En-tête de la page */}
      <div className="dashboard-header">
        <div>
          <p style={{ margin: '0 0 0.25rem 0' }}>
            <Link to="/equipements" className="btn-ghost" style={{ padding: 0 }}>
              <ArrowLeft size={16} /> Retour au parc
            </Link>
          </p>
          <h1 className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>{equipement.marque} {equipement.modele}</span>
            <span className="ref-tag" style={{ fontSize: '1rem', background: '#e2e8f0', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
              {equipement.reference}
            </span>
          </h1>
        </div>

        {/* Actions réservées admin/technicien */}
        {isTechOrAdmin && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              to={`/reclamations/nouvelle?equipementId=${equipement.id}`}
              className="btn"
              style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}
            >
              <AlertCircle size={16} /> Signaler une panne
            </Link>
            {user?.role === 'ADMINISTRATEUR' && (
              <Link to={`/equipements/${equipement.id}/modifier`} className="btn primary">
                <Edit size={16} /> Modifier
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Grille principale : Informations & QR Code */}
      <div className="profile-grid">
        {/* Colonne gauche : Caractéristiques techniques */}
        <div className="card profile-card" style={{ gap: '1.25rem' }}>
          <div className="card-header-pro">
            <Laptop size={20} className="text-primary" />
            <h2>Caractéristiques techniques</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <span className="sub-text">État actuel :</span>
              <div style={{ marginTop: '0.3rem' }}>
                <span className={getEtatBadgeClass(equipement.etat)}>
                  {ETAT_LABELS[equipement.etat]}
                </span>
              </div>
            </div>
            <div>
              <span className="sub-text">Salle d'implantation :</span>
              <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
                <Building size={15} /> {equipement.salleNom ?? 'Non assignée'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
            <div>
              <span className="sub-text">Type d'équipement :</span>
              <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
                <Tag size={15} /> {equipement.typeLibelle ?? 'Non défini'}
              </div>
            </div>
            <div>
              <span className="sub-text">Numéro de série :</span>
              <div style={{ fontWeight: 600, color: '#0f172a', fontFamily: 'monospace', marginTop: '0.3rem' }}>
                {equipement.numeroSerie ?? '—'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
            <div>
              <span className="sub-text">Date d'acquisition :</span>
              <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
                <Calendar size={15} /> {formatDate(equipement.dateAcquisition)}
              </div>
            </div>
            <div>
              <span className="sub-text">Prix d'achat :</span>
              <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
                <DollarSign size={15} /> {formatPrix(equipement.prixAchat)}
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite : Badge QR Code & Statistiques rapides */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card profile-card" style={{ alignItems: 'center', textAlign: 'center', padding: '2rem' }}>
            <div className="card-header-pro" style={{ width: '100%', justifyContent: 'center' }}>
              <QrCode size={20} className="text-primary" />
              <h2>QR Code d'identification</h2>
            </div>
            <p className="sub-text" style={{ margin: '0.2rem 0 1rem 0' }}>Scannez pour un accès direct mobile</p>
            
            {/* Simulation visuelle d'un QR Code propre */}
            <div style={{ background: '#f8fafc', padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '12px', display: 'inline-block' }}>
              <div style={{ width: '130px', height: '130px', background: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.75rem', padding: '0.5rem', wordBreak: 'break-all' }}>
                <QrCode size={48} style={{ marginBottom: '0.5rem', color: '#38bdf8' }} />
                <span>{equipement.qrCode}</span>
              </div>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: '#64748b' }}>
              Format : <code style={{ color: '#0f3d68' }}>{equipement.qrCode}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Section Historique des pannes et interventions */}
      {historique && (
        <div className="panel-card" style={{ marginTop: '1.5rem' }}>
          <div className="panel-header">
            <div>
              <h2>Historique de maintenance & pannes</h2>
              <p className="panel-sub">
                {historique.nbPannes} panne(s) enregistrée(s) · {historique.nbInterventions} intervention(s) · Coût cumulé : <strong style={{ color: '#0f3d68' }}>{formatPrix(historique.coutCumule)}</strong>
              </p>
            </div>
          </div>

          {historique.reclamations.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              Aucun incident ni réclamation n'a été enregistré pour cet équipement.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="pro-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Statut</th>
                    <th>Déclarant</th>
                    <th>Technicien</th>
                  </tr>
                </thead>
                <tbody>
                  {historique.reclamations.map((rec) => (
                    <tr key={rec.id} onClick={() => navigate(`/reclamations/${rec.id}`)} className="clickable-row">
                      <td>{formatDate(rec.dateCreation)}</td>
                      <td className="desc-cell">{rec.description}</td>
                      <td>
                        <span className="badge badge-blue">{rec.statut}</span>
                      </td>
                      <td>{rec.declarantNom}</td>
                      <td>{rec.technicienNom ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}