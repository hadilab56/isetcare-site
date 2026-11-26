import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Smartphone,
  Download,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../api/client';

/** Lien de l'APK : dernière version publiée dans les Releases GitHub (modifiable via VITE_APK_URL). */
const APK_URL =
  import.meta.env.VITE_APK_URL ??
  'https://github.com/hadilab56/ISETCare/releases/latest/download/ISETCare.apk';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Récupère la page d'origine mémorisée par ProtectedRoute (sinon '/')
  const from = (location.state as { from?: string } | null)?.from || '/';

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), motDePasse);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Email ou mot de passe incorrect.'));
    } finally {
      setLoading(false);
    }
  };

  // Remplissage rapide pour vos tests PFE (DataSeeder)
  const fillDemoAccount = (demoEmail: string, demoPwd: string) => {
    setEmail(demoEmail);
    setMotDePasse(demoPwd);
    setError(null);
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        {/* Panneau gauche : Présentation visuelle */}
        <div className="login-brand-panel">
          <div className="login-brand-badge">
            <ShieldCheck size={22} />
            <span>ISETCare</span>
          </div>

          <h1>Gestion du parc matériel et de la maintenance</h1>
          <p>
            ISET Radès : signalement des pannes, suivi des interventions
            et planification de la maintenance préventive.
          </p>

          <div className="login-features">
            <div className="login-feature-item">
              <span className="feature-dot" />
              <span>Signaler une panne et suivre sa réclamation</span>
            </div>
            <div className="login-feature-item">
              <span className="feature-dot" />
              <span>Interventions et maintenance préventive</span>
            </div>
            <div className="login-feature-item">
              <span className="feature-dot" />
              <span>Espaces déclarant, technicien et administrateur</span>
            </div>
          </div>
        </div>

        {/* Panneau droit : Formulaire de connexion */}
        <div className="login-form-panel">
          <div className="login-form-header">
            <h2>Connexion</h2>
            <p>Utilisez votre adresse e-mail et votre mot de passe.</p>
          </div>

          {error && (
            <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Adresse e-mail</label>
              <div className="input-with-icon">
                <Mail size={17} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="prenom.nom@iset.tn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <div className="input-with-icon password-wrapper">
                <Lock size={17} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Afficher ou masquer le mot de passe"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="primary login-submit-btn"
              disabled={loading}
            >
              <LogIn size={18} />
              <span>{loading ? 'Connexion…' : 'Se connecter'}</span>
            </button>
          </form>

          <p style={{ marginTop: '1rem', fontSize: '0.92rem', textAlign: 'center' }}>
            Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
          </p>

          {/* Téléchargement de l'application Android (APK publié dans les « Releases » GitHub) */}
          <div className="app-download-box">
            <Smartphone size={28} color="var(--primary)" />
            <p>
              <strong>Application mobile ISETCare</strong>
              Signalez une panne depuis votre téléphone Android.
            </p>
            <a className="app-download-btn" href={APK_URL} download>
              <Download size={16} />
              Télécharger
            </a>
          </div>

          {/* Raccourcis de démonstration (pratique pour votre soutenance PFE) */}
          <div className="demo-accounts-box">
            <div className="demo-title">
              <span>Comptes de démonstration :</span>
            </div>
            <div className="demo-buttons">
              <button
                type="button"
                className="demo-chip"
                onClick={() => fillDemoAccount('admin@isetcare.tn', 'Admin123!')}
              >
                Admin
              </button>
              <button
                type="button"
                className="demo-chip"
                onClick={() => fillDemoAccount('technicien@isetcare.tn', 'Tech1234!')}
              >
                Technicien
              </button>
              <button
                type="button"
                className="demo-chip"
                onClick={() => fillDemoAccount('enseignant@isetcare.tn', 'Ens12345!')}
              >
                Déclarant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}