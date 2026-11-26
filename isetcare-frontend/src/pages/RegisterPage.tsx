import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../api/client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Inscription : crée un compte déclarant (enseignant ou personnel) puis ouvre la session. */
export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [fonction, setFonction] = useState('Enseignant');
  const [departement, setDepartement] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!prenom.trim() || !nom.trim()) return setError('Le prénom et le nom sont obligatoires.');
    if (!EMAIL_RE.test(email.trim())) return setError('Adresse e-mail invalide.');
    if (motDePasse.length < 8 || !/[a-zA-Z]/.test(motDePasse) || !/\d/.test(motDePasse))
      return setError('Le mot de passe doit contenir au moins 8 caractères, avec des lettres et des chiffres.');
    if (motDePasse !== confirmation) return setError('Les deux mots de passe ne correspondent pas.');

    setLoading(true);
    try {
      await register({
        prenom: prenom.trim(),
        nom: nom.trim(),
        email: email.trim(),
        motDePasse,
        departement: departement.trim() || null,
        fonction,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, "L'inscription a échoué."));
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <div className="login-brand-panel">
          <div className="login-brand-badge">
            <ShieldCheck size={22} />
            <span>ISETCare</span>
          </div>
          <h1>Créer un compte</h1>
          <p>
            Pour les enseignants et le personnel de l'ISET Radès : signalez les pannes du matériel
            et suivez le traitement de vos réclamations.
          </p>
          <p>
            Les comptes technicien et administrateur sont créés par l'administration.
          </p>
        </div>

        <div className="login-form-panel">
          <div className="login-form-header">
            <h2>Inscription</h2>
            <p>Tous les champs sont obligatoires, sauf le département.</p>
          </div>

          {error && (
            <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="form-row">
              <div>
                <label htmlFor="r-prenom">Prénom</label>
                <input id="r-prenom" autoComplete="given-name" value={prenom}
                       onChange={(e) => setPrenom(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="r-nom">Nom</label>
                <input id="r-nom" autoComplete="family-name" value={nom}
                       onChange={(e) => setNom(e.target.value)} required />
              </div>
            </div>

            <label htmlFor="r-email">Adresse e-mail</label>
            <input id="r-email" type="email" autoComplete="email" placeholder="prenom.nom@iset.tn"
                   value={email} onChange={(e) => setEmail(e.target.value)} required />

            <div className="form-row">
              <div>
                <label htmlFor="r-fonction">Fonction</label>
                <select id="r-fonction" value={fonction} onChange={(e) => setFonction(e.target.value)}>
                  <option value="Enseignant">Enseignant(e)</option>
                  <option value="Personnel">Personnel administratif</option>
                </select>
              </div>
              <div>
                <label htmlFor="r-dep">Département</label>
                <input id="r-dep" placeholder="Informatique…" value={departement}
                       onChange={(e) => setDepartement(e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div>
                <label htmlFor="r-mdp">Mot de passe</label>
                <input id="r-mdp" type="password" autoComplete="new-password" value={motDePasse}
                       onChange={(e) => setMotDePasse(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="r-conf">Confirmation</label>
                <input id="r-conf" type="password" autoComplete="new-password" value={confirmation}
                       onChange={(e) => setConfirmation(e.target.value)} required />
              </div>
            </div>
            <p className="sub-text" style={{ margin: '0.35rem 0 0' }}>8 caractères minimum, avec des lettres et des chiffres.</p>

            <button type="submit" className="primary login-submit-btn" disabled={loading}>
              <UserPlus size={18} />
              <span>{loading ? 'Création du compte…' : 'Créer mon compte'}</span>
            </button>
          </form>

          <p style={{ marginTop: '1.25rem', fontSize: '0.92rem' }}>
            Vous avez déjà un compte ? <Link to="/login">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
