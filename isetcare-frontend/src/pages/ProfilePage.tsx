import { useState, type FormEvent } from 'react';
import { User as UserIcon, Lock, Save, CheckCircle2, AlertCircle, Shield, Building, Phone, Mail } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import api, { errorMessage } from '../api/client';
import { ROLE_LABELS } from '../api/types';

export default function ProfilePage() {
  const { user, setUser } = useAuth();

  // États pour la modification du profil
  const [nom, setNom] = useState(user?.nom ?? '');
  const [prenom, setPrenom] = useState(user?.prenom ?? '');
  const [telephone, setTelephone] = useState(user?.telephone ?? '');
  const [departement, setDepartement] = useState(user?.departement ?? '');
  
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // États pour le changement de mot de passe
  const [ancienMotDePasse, setAncienMotDePasse] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');
  
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!user) return null;

  const initials = `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase();

  // Soumission de la mise à jour du profil
  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      // Appel API vers votre backend Spring Boot (ex: PUT /utilisateurs/me ou /auth/profile)
      const res = await api.put('/auth/profile', {
        nom,
        prenom,
        telephone: telephone || null,
        departement: departement || null,
      });

      // Met à jour l'utilisateur dans le contexte global
      if (res.data) {
        setUser({ ...user, nom, prenom, telephone: telephone || null, departement: departement || null });
      }
      setProfileSuccess('Vos informations ont été mises à jour avec succès.');
    } catch (err) {
      setProfileError(errorMessage(err, 'Impossible de mettre à jour le profil.'));
    } finally {
      setProfileLoading(false);
    }
  };

  // Soumission du changement de mot de passe
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (nouveauMotDePasse !== confirmationMotDePasse) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setPasswordLoading(true);
    setPasswordSuccess(null);
    setPasswordError(null);

    try {
      await api.put('/auth/password', {
        ancienMotDePasse,
        nouveauMotDePasse,
      });
      setPasswordSuccess('Votre mot de passe a été modifié avec succès.');
      setAncienMotDePasse('');
      setNouveauMotDePasse('');
      setConfirmationMotDePasse('');
    } catch (err) {
      setPasswordError(errorMessage(err, "Impossible de modifier le mot de passe. Vérifiez l'ancien mot de passe."));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="profile-container">
      {/* En-tête de profil */}
      <div className="profile-hero card">
        <div className="profile-avatar-large">{initials}</div>
        <div className="profile-hero-info">
          <h1>{user.prenom} {user.nom}</h1>
          <p className="profile-email"><Mail size={15} /> {user.email}</p>
          <div className="profile-badges">
            <span className="badge badge-blue">
              <Shield size={13} /> {ROLE_LABELS[user.role]}
            </span>
            {user.departement && (
              <span className="badge badge-amber">
                <Building size={13} /> {user.departement}
              </span>
            )}
            <span className={`badge ${user.actif ? 'badge-green' : 'badge-red'}`}>
              {user.actif ? 'Compte actif' : 'Compte inactif'}
            </span>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        {/* Formulaire : Informations personnelles */}
        <div className="card profile-card">
          <div className="card-header-pro">
            <UserIcon size={20} className="text-primary" />
            <h2>Informations personnelles</h2>
          </div>
          <p className="card-sub-pro">Mettez à jour vos coordonnées et informations professionnelles.</p>

          {profileSuccess && (
            <div className="alert-success">
              <CheckCircle2 size={18} /> {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="alert-error">
              <AlertCircle size={18} /> {profileError}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label>Prénom</label>
                <input
                  type="text"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Nom</label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Téléphone</label>
                <div className="input-with-icon">
                  <Phone size={16} className="input-icon" />
                  <input
                    type="tel"
                    placeholder="Ex: +216 98 123 456"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Département</label>
                <div className="input-with-icon">
                  <Building size={16} className="input-icon" />
                  <input
                    type="text"
                    placeholder="Ex: Informatique"
                    value={departement}
                    onChange={(e) => setDepartement(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="primary" disabled={profileLoading}>
                <Save size={16} />
                {profileLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>

        {/* Formulaire : Sécurité & Mot de passe */}
        <div className="card profile-card">
          <div className="card-header-pro">
            <Lock size={20} className="text-primary" />
            <h2>Sécurité du compte</h2>
          </div>
          <p className="card-sub-pro">Modifiez votre mot de passe pour sécuriser votre accès.</p>

          {passwordSuccess && (
            <div className="alert-success">
              <CheckCircle2 size={18} /> {passwordSuccess}
            </div>
          )}
          {passwordError && (
            <div className="alert-error">
              <AlertCircle size={18} /> {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="profile-form">
            <div className="form-group">
              <label>Ancien mot de passe</label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={ancienMotDePasse}
                onChange={(e) => setAncienMotDePasse(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Nouveau mot de passe</label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={nouveauMotDePasse}
                onChange={(e) => setNouveauMotDePasse(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={confirmationMotDePasse}
                onChange={(e) => setConfirmationMotDePasse(e.target.value)}
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="primary" disabled={passwordLoading}>
                <Lock size={16} />
                {passwordLoading ? 'Modification...' : 'Changer le mot de passe'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}