import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Sparkles,
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
            <ShieldCheck size={28} />
            <span>ISETCare GMAO</span>
          </div>

          <h1>Gestion intelligente du parc matériel et des maintenances</h1>
          <p>
            Plateforme centralisée pour le suivi des équipements, la déclaration
            rapide des pannes par QR Code et l'aide à la décision assistée par IA.
          </p>

          <div className="login-features">
            <div className="login-feature-item">
              <span className="feature-dot" />
              <span>Suivi en temps réel des réclamations</span>
            </div>
            <div className="login-feature-item">
              <span className="feature-dot" />
              <span>Diagnostic intelligent & maintenance préventive</span>
            </div>
            <div className="login-feature-item">
              <span className="feature-dot" />
              <span>Espaces dédiés Déclarant, Technicien & Admin</span>
            </div>
          </div>
        </div>

        {/* Panneau droit : Formulaire de connexion */}
        <div className="login-form-panel">
          <div className="login-form-header">
            <h2>Connexion</h2>
            <p>Entrez vos identifiants institutionnels pour accéder à votre espace</p>
          </div>

          {error && (
            <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Adresse email</label>
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
              className="btn-primary-pro login-submit-btn"
              disabled={loading}
            >
              <LogIn size={18} />
              <span>{loading ? 'Connexion en cours...' : 'Se connecter'}</span>
            </button>
          </form>

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
              <Sparkles size={14} />
              <span>Comptes de démonstration (1 clic) :</span>
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