import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lightbulb, AlertTriangle } from 'lucide-react';
import { errorMessage } from '../api/client';
import { getEquipement } from '../api/materiel';
import { analyzeDescription } from '../api/ai';
import { createReclamation } from '../api/reclamations';
import { PRIORITES, PRIORITE_LABELS, type AiAnalysis, type Equipement, type Priorite } from '../api/types';
import EquipementPicker from '../components/EquipementPicker';
import { useAuth } from '../auth/AuthContext';

const MAX_PHOTO = 5 * 1024 * 1024; // 5 Mo

const toPriorite = (v: string | null | undefined): '' | Priorite =>
  (PRIORITES as string[]).includes(v ?? '') ? (v as Priorite) : '';

const pourcent = (s: number): number => Math.round(s <= 1 ? s * 100 : s);

const CATEGORIES = ['Réseau', 'Informatique', 'Audiovisuel', 'Impression', 'Climatisation', 'Électricité', 'Autre'];

/** Astuce de premier niveau selon la catégorie (sans accents pour la comparaison). */
const astuce = (categorie: string): string => {
  const c = categorie.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (c.includes('reseau')) return 'Vérifiez que le câble réseau RJ45 est bien branché, ou désactivez puis réactivez le Wi-Fi.';
  if (c.includes('electric')) return "Vérifiez que l'appareil est branché sur une prise active (témoin lumineux). En cas d'odeur de brûlé, ne touchez à rien.";
  if (c.includes('impression')) return "Vérifiez le papier et le toner, puis éteignez et rallumez l'imprimante.";
  if (c.includes('audiovisuel')) return "Vérifiez le câble HDMI/VGA et la source sélectionnée avec la télécommande.";
  if (c.includes('climatisation')) return 'Vérifiez le mode et la température réglés sur la télécommande.';
  return "Essayez de redémarrer complètement l'équipement. Si le problème persiste, envoyez la réclamation.";
};

export default function ReclamationNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [equipement, setEquipement] = useState<Equipement | null>(null);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // IA commune
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [analysedText, setAnalysedText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [categorie, setCategorie] = useState('');
  const [priorite, setPriorite] = useState<'' | Priorite>('');

  // Simulation d'une astuce rapide pour le déclarant basée sur le type de panne
  const [quickTip, setQuickTip] = useState<string | null>(null);
  const [popup, setPopup] = useState(false);

  const isDeclarant = user?.role === 'DECLARANT';

  useEffect(() => {
    const id = Number(params.get('equipementId'));
    if (!params.get('equipementId') || !Number.isInteger(id)) return;
    getEquipement(id).then(setEquipement).catch((err) => setError(errorMessage(err)));
  }, [params]);

  useEffect(() => {
    if (!photo) { setPreview(''); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const onPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setError('');
    if (file && !file.type.startsWith('image/')) {
      e.target.value = '';
      return setError('Le fichier doit être une image.');
    }
    if (file && file.size > MAX_PHOTO) {
      e.target.value = '';
      return setError('Photo trop volumineuse (5 Mo maximum).');
    }
    setPhoto(file);
  };

  const askAi = async () => {
    const text = description.trim();
    setAiError('');
    setAiLoading(true);
    setQuickTip(null);
    try {
      const res = await analyzeDescription(text, equipement?.id);
      setAnalysis(res);
      setAnalysedText(text);
      setCategorie(res.categorieSuggeree ?? '');
      setPriorite(toPriorite(res.prioriteSuggeree));
      setQuickTip(astuce(res.categorieSuggeree ?? ''));
      setPopup(true);
    } catch (err) {
      setAiError(errorMessage(err, "Le service d'IA est momentanément indisponible. Vous pouvez envoyer votre réclamation."));
    } finally {
      setAiLoading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!equipement) return setError("Choisissez l'équipement concerné.");
    if (description.trim().length < 10) return setError('Décrivez la panne en au moins 10 caractères.');
    setSaving(true);
    try {
      const created = await createReclamation({
        equipementId: equipement.id,
        description: description.trim(),
        photo,
        categorie: categorie.trim() || null,
        priorite: priorite || null,
        ia: analysis,
      });
      navigate(`/reclamations/${created.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      <p><Link to="/reclamations" className="btn-ghost">← Retour aux réclamations</Link></p>
      
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Signaler une panne</h1>
          <p className="dashboard-subtitle">Décrivez le problème rencontré sur l'équipement.</p>
        </div>
      </div>

      <form className="card panel-card" onSubmit={submit}>
        {error && <div className="alert-error">{error}</div>}

        <div className="form-group">
          <label>Équipement concerné</label>
          <EquipementPicker value={equipement} onChange={setEquipement} />
        </div>

        <div className="form-group">
          <label htmlFor="desc">Description de la panne</label>
          <textarea
            id="desc"
            rows={5}
            required
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex. : l'ordinateur ne s'allume plus, l'écran reste noir…"
          />
          <div className="sub-text" style={{ marginTop: '0.3rem' }}>
            {description.trim().length} / 2000 caractères (10 minimum requis)
          </div>
        </div>

        {/* Bouton pour déclencher l'analyse IA (accessible à tous, mais affichage adapté) */}
        <div style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            className="btn primary"
            onClick={() => void askAi()}
            disabled={aiLoading || description.trim().length < 10}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Lightbulb size={16} />
            {aiLoading ? 'Analyse en cours…' : "Proposer catégorie et priorité (IA)"}
          </button>
          {description.trim().length < 10 && (
            <span className="sub-text" style={{ marginLeft: '0.75rem' }}>Écrivez 10 caractères minimum pour activer.</span>
          )}
        </div>

        {aiError && <div className="alert-error" style={{ marginBottom: '1rem' }}>{aiError}</div>}

        {/* Classification retenue (modifiable via la pop-up) */}
        {analysis && !popup && (
          <div className="card" style={{ background: '#f8fafc', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Lightbulb size={16} />
              <span>Catégorie : <strong>{categorie || 'non précisée'}</strong></span>
              <span>· Priorité : <strong>{priorite ? PRIORITE_LABELS[priorite] : 'Moyenne'}</strong></span>
              <button type="button" className="btn" onClick={() => setPopup(true)}>Modifier</button>
            </div>
            {description.trim() !== analysedText && (
              <p className="sub-text" style={{ marginTop: '0.5rem', color: '#b45309' }}>
                <AlertTriangle size={14} /> La description a changé depuis l'analyse : relancez l'IA pour une suggestion à jour.
              </p>
            )}
          </div>
        )}

        {/* Pop-up de suggestion de l'IA */}
        {analysis && popup && (
          <div className="modal-backdrop" onMouseDown={() => setPopup(false)}>
            <div className="modal card" role="dialog" aria-modal="true" aria-labelledby="ai-title"
                 onMouseDown={(e) => e.stopPropagation()}>
              <h2 id="ai-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
                <Lightbulb size={20} /> Suggestion de l'IA
              </h2>
              <p className="sub-text">
                Analyse : <strong>{analysis.source === 'gemini' ? 'Gemini (IA)' : 'mots-clés'}</strong>
                {' · '}Confiance : <strong>{pourcent(analysis.scoreConfiance)} %</strong>
                {analysis.typePanneProbable && <> · Cause probable : <strong>{analysis.typePanneProbable}</strong></>}
              </p>
              {analysis.explication && <p className="sub-text">{analysis.explication}</p>}
              {analysis.regleSecuriteAppliquee && (
                <div className="alert-error">Danger possible détecté : priorité urgente. Éloignez-vous de l'équipement si nécessaire.</div>
              )}
              {analysis.aVerifier && (
                <p className="sub-text" style={{ color: '#b45309' }}>Confiance faible : vérifiez la catégorie proposée.</p>
              )}
              <div className="form-row" style={{ marginTop: '0.75rem' }}>
                <div className="form-group">
                  <label htmlFor="cat">Catégorie</label>
                  <select id="cat" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                    {!CATEGORIES.includes(categorie) && categorie && <option value={categorie}>{categorie}</option>}
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="prio">Priorité</label>
                  <select id="prio" value={priorite} onChange={(e) => setPriorite(e.target.value as '' | Priorite)}>
                    <option value="">Par défaut (moyenne)</option>
                    {PRIORITES.map((x) => <option key={x} value={x}>{PRIORITE_LABELS[x]}</option>)}
                  </select>
                </div>
              </div>
              {isDeclarant && quickTip && (
                <p className="sub-text" style={{ display: 'flex', gap: '0.5rem' }}>
                  <Lightbulb size={16} style={{ flexShrink: 0, color: '#0284c7' }} /> {quickTip}
                </p>
              )}
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => {
                  setAnalysis(null); setCategorie(''); setPriorite(''); setPopup(false);
                }}>Ignorer</button>
                <button type="button" className="primary" onClick={() => setPopup(false)}>Valider</button>
              </div>
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="photo">Photo justificative (facultative)</label>
          <input id="photo" type="file" accept="image/*" onChange={onPhoto} />
          {preview && (
            <div style={{ marginTop: '0.75rem' }}>
              <img className="photo preview" src={preview} alt="Aperçu" style={{ maxWidth: '200px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
          )}
        </div>

        <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
          <Link className="btn" to="/reclamations">Annuler</Link>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? 'Envoi en cours…' : 'Envoyer la réclamation'}
          </button>
        </div>
      </form>
    </div>
  );
}