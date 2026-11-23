import { useEffect, useState, useMemo } from 'react';
import {  Search } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { ROLE_LABELS, type Role, type User } from '../api/types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    api
      .get<User[]>('/utilisateurs')
      .then((res) => setUsers(res.data))
      .catch((err) => setError(errorMessage(err, 'Impossible de charger les utilisateurs.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActif = async (u: User) => {
    try {
      await api.patch(`/utilisateurs/${u.id}/actif`, { actif: !u.actif });
      fetchUsers();
    } catch (err) {
      setError(errorMessage(err, 'Impossible de modifier le statut de ce compte.'));
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMINISTRATEUR':
        return 'badge badge-red';
      case 'TECHNICIEN':
        return 'badge badge-amber';
      default:
        return 'badge badge-blue';
    }
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        `${u.prenom} ${u.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.departement && u.departement.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchRole = selectedRole ? u.role === selectedRole : true;
      return matchSearch && matchRole;
    });
  }, [users, searchTerm, selectedRole]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Gestion des utilisateurs</h1>
          <p className="dashboard-subtitle">Administration des comptes, rôles et disponibilités des techniciens.</p>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="panel-card">
        <div className="panel-header">
          <div>
            <h2>Membres enregistrés</h2>
            <p className="panel-sub">{filtered.length} utilisateur(s) affiché(s)</p>
          </div>

          <div className="panel-actions">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Nom, email, département..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} style={{ width: 'auto' }}>
              <option value="">Tous les rôles</option>
              <option value="ADMINISTRATEUR">Administrateurs</option>
              <option value="TECHNICIEN">Techniciens</option>
              <option value="DECLARANT">Déclarants</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Chargement...</div>
        ) : (
          <div className="table-responsive">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Rôle</th>
                  <th>Département / Spécialité</th>
                  <th>Contact</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Accès</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const initials = `${u.prenom.charAt(0)}${u.nom.charAt(0)}`.toUpperCase();
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div className="user-avatar" style={{ background: '#dbeafe', color: '#0f3d68' }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.prenom} {u.nom}</div>
                            <div className="sub-text">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={getRoleBadge(u.role)}>{ROLE_LABELS[u.role]}</span>
                      </td>
                      <td>
                        {u.departement || u.specialite || u.service || '—'}
                      </td>
                      <td>{u.telephone ?? '—'}</td>
                      <td>
                        <span className={`badge ${u.actif ? 'badge-green' : 'badge-red'}`}>
                          {u.actif ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => handleToggleActif(u)}
                        >
                          {u.actif ? 'Désactiver' : 'Activer'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}