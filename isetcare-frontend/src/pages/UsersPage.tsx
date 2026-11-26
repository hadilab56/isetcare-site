import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Pencil, PlusCircle, Search, Trash2 } from 'lucide-react';
import { errorMessage } from '../api/client';
import { createUser, deleteUser, listUsers, setUserActif, updateUser, type UserInput } from '../api/users';
import { ROLE_LABELS, type Role, type User } from '../api/types';
import { useAuth } from '../auth/AuthContext';

const ROLES: Role[] = ['DECLARANT', 'TECHNICIEN', 'ADMINISTRATEUR'];

const VIDE: UserInput = {
  nom: '', prenom: '', email: '', motDePasse: '', telephone: '', role: 'DECLARANT',
  departement: '', fonction: '', service: '', specialite: '', disponible: true,
};

/** US02 : gestion des comptes par l'administrateur (création, modification, activation, suppression). */
export default function UsersPage() {
  const { user: moi } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Formulaire : undefined = fermé, null = création, sinon = compte modifié
  const [edite, setEdite] = useState<User | null | undefined>(undefined);
  const [form, setForm] = useState<UserInput>(VIDE);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const charger = () => {
    setLoading(true);
    listUsers()
      .then(setUsers)
      .catch((err) => setError(errorMessage(err, 'Impossible de charger les utilisateurs.')))
      .finally(() => setLoading(false));
  };

  useEffect(charger, []);

  const ouvrir = (u: User | null) => {
    setFormError('');
    setForm(u ? {
      nom: u.nom, prenom: u.prenom, email: u.email, motDePasse: '', telephone: u.telephone ?? '', role: u.role,
      departement: u.departement ?? '', fonction: u.fonction ?? '', service: u.service ?? '',
      specialite: u.specialite ?? '', disponible: u.disponible ?? true,
    } : VIDE);
    setEdite(u);
  };

  const set = <K extends keyof UserInput>(k: K, v: UserInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const texte = (v: string | null) => (v && v.trim() ? v.trim() : null);

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    const mdp = form.motDePasse ?? '';
    if (edite === null && mdp.length < 8) return setFormError('Mot de passe : 8 caractères minimum.');
    if (edite && mdp !== '' && mdp.length < 8) return setFormError('Nouveau mot de passe : 8 caractères minimum.');
    const input: UserInput = {
      nom: form.nom.trim(), prenom: form.prenom.trim(), email: form.email.trim(),
      motDePasse: mdp === '' ? null : mdp, telephone: texte(form.telephone), role: form.role,
      departement: form.role === 'DECLARANT' ? texte(form.departement) : null,
      fonction: form.role === 'DECLARANT' ? texte(form.fonction) : null,
      service: form.role === 'ADMINISTRATEUR' ? texte(form.service) : null,
      specialite: form.role === 'TECHNICIEN' ? texte(form.specialite) : null,
      disponible: form.role === 'TECHNICIEN' ? form.disponible : null,
    };
    setSaving(true);
    try {
      if (edite) await updateUser(edite.id, input);
      else await createUser(input);
      setOk(edite ? 'Compte modifié.' : 'Compte créé.');
      setEdite(undefined);
      charger();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const basculerActif = async (u: User) => {
    setError(null); setOk('');
    try {
      await setUserActif(u.id, !u.actif);
      setOk(u.actif ? 'Compte désactivé.' : 'Compte réactivé.');
      charger();
    } catch (err) {
      setError(errorMessage(err, 'Impossible de modifier le statut de ce compte.'));
    }
  };

  const supprimer = async (u: User) => {
    if (!window.confirm(`Supprimer définitivement le compte de ${u.prenom} ${u.nom} ?`)) return;
    setError(null); setOk('');
    try {
      await deleteUser(u.id);
      setOk('Compte supprimé.');
      charger();
    } catch (err) {
      setError(errorMessage(err, 'Suppression impossible.'));
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return users.filter((u) =>
      (`${u.prenom} ${u.nom}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        || (u.departement ?? '').toLowerCase().includes(q))
      && (!selectedRole || u.role === selectedRole));
  }, [users, searchTerm, selectedRole]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Utilisateurs</h1>
          <p className="dashboard-subtitle">Comptes, rôles et disponibilité des techniciens.</p>
        </div>
        <button type="button" className="btn-primary-pro" onClick={() => ouvrir(null)}>
          <PlusCircle size={18} /> <span>Nouveau compte</span>
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {ok && <div className="alert-success">{ok}</div>}

      {edite !== undefined && (
        <div className="modal-backdrop" onMouseDown={() => setEdite(undefined)}>
          <form className="modal card wide" onSubmit={enregistrer} onMouseDown={(e) => e.stopPropagation()}>
            <h3>{edite ? `Modifier le compte de ${edite.prenom} ${edite.nom}` : 'Nouveau compte'}</h3>
            {formError && <div className="alert alert-error">{formError}</div>}
            <div className="row">
              <div><label htmlFor="u-prenom">Prénom</label>
                <input id="u-prenom" required value={form.prenom} onChange={(e) => set('prenom', e.target.value)} /></div>
              <div><label htmlFor="u-nom">Nom</label>
                <input id="u-nom" required value={form.nom} onChange={(e) => set('nom', e.target.value)} /></div>
            </div>
            <div className="row">
              <div><label htmlFor="u-email">Adresse e-mail</label>
                <input id="u-email" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
              <div><label htmlFor="u-tel">Téléphone</label>
                <input id="u-tel" value={form.telephone ?? ''} onChange={(e) => set('telephone', e.target.value)} /></div>
            </div>
            <div className="row">
              <div><label htmlFor="u-role">Rôle</label>
                <select id="u-role" value={form.role} onChange={(e) => set('role', e.target.value as Role)}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select></div>
              <div><label htmlFor="u-mdp">{edite ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe'}</label>
                <input id="u-mdp" type="password" autoComplete="new-password" required={edite === null}
                       value={form.motDePasse ?? ''} onChange={(e) => set('motDePasse', e.target.value)} /></div>
            </div>
            {form.role === 'DECLARANT' && (
              <div className="row">
                <div><label htmlFor="u-dep">Département</label>
                  <input id="u-dep" value={form.departement ?? ''} onChange={(e) => set('departement', e.target.value)} /></div>
                <div><label htmlFor="u-fct">Fonction</label>
                  <input id="u-fct" placeholder="Enseignant, personnel…" value={form.fonction ?? ''}
                         onChange={(e) => set('fonction', e.target.value)} /></div>
              </div>
            )}
            {form.role === 'TECHNICIEN' && (
              <div className="row">
                <div><label htmlFor="u-spe">Spécialité</label>
                  <input id="u-spe" value={form.specialite ?? ''} onChange={(e) => set('specialite', e.target.value)} /></div>
                <div><label htmlFor="u-dispo">Disponibilité</label>
                  <select id="u-dispo" value={form.disponible ? 'oui' : 'non'}
                          onChange={(e) => set('disponible', e.target.value === 'oui')}>
                    <option value="oui">Disponible</option>
                    <option value="non">Indisponible</option>
                  </select></div>
              </div>
            )}
            {form.role === 'ADMINISTRATEUR' && (
              <><label htmlFor="u-svc">Service</label>
                <input id="u-svc" value={form.service ?? ''} onChange={(e) => set('service', e.target.value)} /></>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setEdite(undefined)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel-card">
        <div className="panel-header">
          <div>
            <h2>Comptes</h2>
            <p className="panel-sub">{filtered.length} compte(s) affiché(s)</p>
          </div>
          <div className="panel-actions">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Nom, e-mail, département…" value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} style={{ width: 'auto' }}>
              <option value="">Tous les rôles</option>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Chargement…</div>
        ) : (
          <div className="table-responsive">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Rôle</th>
                  <th>Département / spécialité</th>
                  <th>Téléphone</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.prenom} {u.nom}</div>
                      <div className="sub-text">{u.email}</div>
                    </td>
                    <td>{ROLE_LABELS[u.role]}</td>
                    <td>{u.departement || u.specialite || u.service || '—'}</td>
                    <td>{u.telephone ?? '—'}</td>
                    <td>
                      <span className={`badge ${u.actif ? 'badge-green' : 'badge-red'}`}>
                        {u.actif ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="btn btn-small" onClick={() => ouvrir(u)}>
                          <Pencil size={14} /> Modifier
                        </button>
                        {u.id !== moi?.id && (
                          <>
                            <button type="button" className="btn btn-small" onClick={() => basculerActif(u)}>
                              {u.actif ? 'Désactiver' : 'Activer'}
                            </button>
                            <button type="button" className="btn btn-small danger" onClick={() => supprimer(u)}
                                    aria-label={`Supprimer ${u.prenom} ${u.nom}`}>
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
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
