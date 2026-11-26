import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  User, Wrench, Laptop, Building, Calendar, ArrowLeft, FileText, UserCog, CheckCircle2, Pencil, Trash2,
} from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  STATUT_LABELS,
  PRIORITE_LABELS,
  type Reclamation,
  type StatutReclamation } from '../api/types';
import { formatDateTime } from '../utils/format';
import {
  affecterTechnicien, changerPriorite, cloturerReclamation, listTechniciens, modifierReclamation, supprimerReclamation,
} from '../api/reclamations';
import { changerStatut, deleteIntervention, listInterventions } from '../api/suivi';
import { PRIORITES, type Intervention, type Priorite, type User as Utilisateur } from '../api/types';
import InterventionForm from '../components/InterventionForm';
import InterventionList from '../components/InterventionList';
import PhotoView from '../components/PhotoView';

export default function ReclamationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [techniciens, setTechniciens] = useState<Utilisateur[]>([]);
  const [techChoisi, setTechChoisi] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [ok, setOk] = useState('');

  const [reclamation, setReclamation] = useState<Reclamation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  // Administrateur : modification de la réclamation et correction des interventions
  const [edition, setEdition] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editCategorie, setEditCategorie] = useState('');
  const [editPriorite, setEditPriorite] = useState<Priorite>('MOYENNE');
  const [interventionEditee, setInterventionEditee] = useState<Intervention | null>(null);

  // Charger les détails de la réclamation
  const fetchReclamation = () => {
    setLoading(true);
    api
      .get<Reclamation>(`/reclamations/${id}`)
      .then((res) => {
        setReclamation(res.data);
        if (user?.role !== 'DECLARANT') {
          listInterventions(res.data.id).then(setInterventions).catch(() => setInterventions([]));
        }
      })
      .catch((err) => setError(errorMessage(err, 'Réclamation introuvable.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (id) fetchReclamation();
  }, [id]);

  useEffect(() => {
    if (user?.role === 'ADMINISTRATEUR') listTechniciens().then(setTechniciens).catch(() => setTechniciens([]));
  }, [user?.role]);

  /** Exécute une action, affiche le message de succès puis recharge la réclamation. */
  const action = async (fn: () => Promise<unknown>, message: string) => {
    setActionLoading(true); setError(null); setOk('');
    try {
      await fn();
      setOk(message);
      fetchReclamation();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Technicien affecté : AFFECTEE -> EN_COURS, puis EN_COURS -> RESOLU (règles du serveur)
  const handleUpdateStatut = (nouveauStatut: 'EN_COURS' | 'RESOLU') =>
    action(() => changerStatut(Number(id), nouveauStatut),
      nouveauStatut === 'RESOLU' ? 'Réclamation marquée comme résolue.' : 'Réclamation prise en charge.');

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

  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!reclamation) {
    return (
      <div className="dashboard-container">
        <p>
          <Link to="/reclamations" className="btn-ghost">
            <ArrowLeft size={16} /> Retour aux réclamations
          </Link>
        </p>
        <div className="alert-error">{error ?? 'Réclamation introuvable.'}</div>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMINISTRATEUR';
  const isTechAffecte = user?.role === 'TECHNICIEN' && reclamation.technicienId === user.id;
  const ouverte = reclamation.statut !== 'RESOLU' && reclamation.statut !== 'CLOTURE';

  return (
    <div className="dashboard-container">
      {/* Fil d'Ariane & Bouton retour */}
      <div className="dashboard-header">
        <div>
          <p style={{ margin: '0 0 0.25rem 0' }}>
            <Link to="/reclamations" className="btn-ghost" style={{ padding: 0 }}>
              <ArrowLeft size={16} /> Retour à la liste
            </Link>
          </p>
          <h1 className="dashboard-title">
            Réclamation #{reclamation.id} — <span className="ref-tag">{reclamation.equipementReference}</span>
          </h1>
        </div>

        {/* Actions du technicien affecté */}
        {isTechAffecte && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {reclamation.statut === 'AFFECTEE' && (
              <button type="button" className="primary" disabled={actionLoading}
                      onClick={() => handleUpdateStatut('EN_COURS')}>
                Prendre en charge
              </button>
            )}
            {(reclamation.statut === 'AFFECTEE' || reclamation.statut === 'EN_COURS') && (
              <button type="button" className="btn-primary-pro" onClick={() => setShowForm(true)}>
                <Wrench size={16} /> Saisir une intervention
              </button>
            )}
            {reclamation.statut === 'EN_COURS' && (
              <button type="button" className="btn" disabled={actionLoading || interventions.length === 0}
                      title={interventions.length === 0 ? "Enregistrez d'abord une intervention" : undefined}
                      onClick={() => handleUpdateStatut('RESOLU')}>
                <CheckCircle2 size={16} /> Marquer comme résolue
              </button>
            )}
          </div>
        )}
      </div>

      {error && <div className="alert-error">{error}</div>}
      {ok && <div className="alert-success">{ok}</div>}

      {/* Actions de l'administrateur */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header-pro">
            <UserCog size={20} className="text-primary" /><h2>Gestion de la réclamation</h2>
            <span className="row-actions" style={{ marginLeft: 'auto' }}>
              <button type="button" className="btn btn-small" disabled={actionLoading} onClick={() => {
                setEditDescription(reclamation.description);
                setEditCategorie(reclamation.categorie ?? '');
                setEditPriorite(reclamation.priorite);
                setEdition(true);
              }}>
                <Pencil size={14} /> Modifier
              </button>
              <button type="button" className="btn btn-small danger" disabled={actionLoading} onClick={async () => {
                if (!window.confirm(`Supprimer la réclamation #${reclamation.id} et ses interventions ? Cette action est définitive.`)) return;
                try {
                  await supprimerReclamation(reclamation.id);
                  navigate('/reclamations');
                } catch (err) {
                  setError(errorMessage(err));
                }
              }}>
                <Trash2 size={14} /> Supprimer
              </button>
            </span>
          </div>
          {reclamation.statut !== 'CLOTURE' && (
          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            {ouverte && (
              <div className="form-group">
                <label htmlFor="tech">{reclamation.technicienId ? 'Réaffecter à' : 'Affecter à'}</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select id="tech" value={techChoisi} onChange={(e) => setTechChoisi(e.target.value)}>
                    <option value="">Choisir un technicien…</option>
                    {techniciens.map((t) => (
                      <option key={t.id} value={t.id}>{t.prenom} {t.nom}{t.specialite ? ` · ${t.specialite}` : ''}</option>
                    ))}
                  </select>
                  <button type="button" className="primary" disabled={!techChoisi || actionLoading}
                          onClick={() => action(() => affecterTechnicien(reclamation.id, Number(techChoisi)),
                            'Technicien affecté et notifié.')}>
                    Affecter
                  </button>
                </div>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="prio">Priorité</label>
              <select id="prio" value={reclamation.priorite} disabled={actionLoading}
                      onChange={(e) => action(() => changerPriorite(reclamation.id, e.target.value as Priorite),
                        'Priorité modifiée.')}>
                {PRIORITES.map((p) => <option key={p} value={p}>{PRIORITE_LABELS[p]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <button type="button" className="btn" disabled={actionLoading}
                      onClick={() => {
                        if (window.confirm(`Clôturer la réclamation #${reclamation.id} ?`))
                          void action(() => cloturerReclamation(reclamation.id), 'Réclamation clôturée.');
                      }}>
                Clôturer
              </button>
            </div>
          </div>
          )}
        </div>
      )}

      {showForm && (
        <InterventionForm
          reclamationId={reclamation.id}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); setOk('Intervention enregistrée.'); fetchReclamation(); }}
        />
      )}

      {interventionEditee && (
        <InterventionForm
          reclamationId={reclamation.id}
          intervention={interventionEditee}
          onClose={() => setInterventionEditee(null)}
          onSaved={() => { setInterventionEditee(null); setOk('Intervention modifiée.'); fetchReclamation(); }}
        />
      )}

      {edition && (
        <div className="modal-backdrop" onMouseDown={() => setEdition(false)}>
          <form className="modal card" onMouseDown={(e) => e.stopPropagation()}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editDescription.trim().length < 10) {
                    setError('La description doit contenir au moins 10 caractères.');
                    return;
                  }
                  setEdition(false);
                  void action(() => modifierReclamation(reclamation.id, {
                    description: editDescription.trim(),
                    categorie: editCategorie.trim() || null,
                    priorite: editPriorite,
                  }), 'Réclamation modifiée.');
                }}>
            <h3>Modifier la réclamation #{reclamation.id}</h3>
            <label htmlFor="edit-desc">Description</label>
            <textarea id="edit-desc" rows={5} required minLength={10} maxLength={2000}
                      value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            <div className="row">
              <div>
                <label htmlFor="edit-cat">Catégorie</label>
                <input id="edit-cat" value={editCategorie} onChange={(e) => setEditCategorie(e.target.value)} />
              </div>
              <div>
                <label htmlFor="edit-prio">Priorité</label>
                <select id="edit-prio" value={editPriorite} onChange={(e) => setEditPriorite(e.target.value as Priorite)}>
                  {PRIORITES.map((p) => <option key={p} value={p}>{PRIORITE_LABELS[p]}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setEdition(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      )}

      <div className="profile-grid">
        {/* Colonne gauche : Détails de la panne */}
        <div className="card profile-card" style={{ gap: '1.25rem' }}>
          <div className="card-header-pro">
            <FileText size={20} className="text-primary" />
            <h2>Informations du signalement</h2>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <span className="sub-text">Statut actuel : </span>
              <span className={getStatutBadgeClass(reclamation.statut)}>
                {STATUT_LABELS[reclamation.statut]}
              </span>
            </div>
            <div>
              <span className="sub-text">Priorité : </span>
              <span className={`prio-dot prio-${reclamation.priorite.toLowerCase()}`}>
                {PRIORITE_LABELS[reclamation.priorite]}
              </span>
            </div>
            {reclamation.categorie && (
              <div>
                <span className="sub-text">Catégorie : </span>
                <strong>{reclamation.categorie}</strong>
              </div>
            )}
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Description détaillée de la panne</label>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                fontSize: '0.95rem',
                lineHeight: '1.5',
                color: '#1e293b',
                whiteSpace: 'pre-wrap',
              }}
            >
              {reclamation.description}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <span className="sub-text">Déclaré par :</span>
              <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                <User size={15} /> {reclamation.declarantNom}
              </div>
            </div>
            <div>
              <span className="sub-text">Date de création :</span>
              <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                <Calendar size={15} /> {formatDateTime(reclamation.dateCreation)}
              </div>
            </div>
          </div>

          <div>
            <span className="sub-text">Technicien assigné :</span>
            <div style={{ fontWeight: 600, color: reclamation.technicienNom ? '#0f172a' : '#94a3b8', marginTop: '0.2rem' }}>
              {reclamation.technicienNom ?? 'Aucun technicien assigné pour le moment'}
            </div>
          </div>
        </div>

        {/* Colonne droite : Équipement & Salle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card profile-card">
            <div className="card-header-pro">
              <Laptop size={20} className="text-primary" />
              <h2>Équipement concerné</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div>
                <span className="sub-text">Référence :</span>
                <div className="ref-tag" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  {reclamation.equipementReference}
                </div>
              </div>
              <div>
                <span className="sub-text">Libellé / Modèle :</span>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{reclamation.equipementLibelle}</div>
              </div>
              <div>
                <span className="sub-text">Salle d'implantation :</span>
                <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <Building size={15} /> {reclamation.salleNom ?? 'Non assignée'}
                </div>
              </div>

              <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                <Link
                  to={`/equipements/${reclamation.equipementId}`}
                  className="btn"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Voir la fiche complète de l'équipement
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {reclamation.avecPhoto && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3>Photo jointe</h3>
          <PhotoView reclamationId={reclamation.id} />
        </div>
      )}

      {user?.role !== 'DECLARANT' && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3>Interventions ({interventions.length})</h3>
          <InterventionList
            items={interventions}
            onEdit={isAdmin ? setInterventionEditee : undefined}
            onDelete={isAdmin ? (i) => {
              if (window.confirm('Supprimer cette intervention ? Cette action est définitive.'))
                void action(() => deleteIntervention(i.id), 'Intervention supprimée.');
            } : undefined}
          />
        </div>
      )}
    </div>
  );
}