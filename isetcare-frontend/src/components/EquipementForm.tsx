import { useState, type FormEvent } from 'react';
import { errorMessage } from '../api/client';
import { createEquipement, updateEquipement } from '../api/materiel';
import { ETATS, ETAT_LABELS, type Equipement, type EtatEquipement, type Salle, type TypeEquipement } from '../api/types';
import { today } from '../utils/format';

interface Props {
  equipement: Equipement | null; // null = création
  salles: Salle[];
  types: TypeEquipement[];
  onClose: () => void;
  onSaved: (e: Equipement) => void;
}

interface FormState {
  reference: string; marque: string; modele: string; numeroSerie: string;
  dateAcquisition: string; prixAchat: string; etat: EtatEquipement; salleId: string; typeId: string;
}

const toText = (v: string | number | null | undefined): string => (v === null || v === undefined ? '' : String(v));

/** Création / modification d'un équipement (fenêtre modale). Réservé à l'administrateur côté interface ET côté API. */
export default function EquipementForm({ equipement, salles, types, onClose, onSaved }: Props) {
  const isNew = equipement === null;
  const [form, setForm] = useState<FormState>({
    reference: equipement?.reference ?? '',
    marque: equipement?.marque ?? '',
    modele: equipement?.modele ?? '',
    numeroSerie: equipement?.numeroSerie ?? '',
    dateAcquisition: equipement?.dateAcquisition ?? '',
    prixAchat: toText(equipement?.prixAchat),
    etat: equipement?.etat ?? 'EN_SERVICE',
    salleId: toText(equipement?.salleId),
    typeId: toText(equipement?.typeId),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation côté client (le serveur revalide de toute façon)
    if (!form.reference.trim()) return setError('La référence est obligatoire.');
    if (!form.salleId) return setError('Choisissez une salle.');
    if (!form.typeId) return setError("Choisissez un type d'équipement.");
    if (form.prixAchat !== '') {
      const prix = Number(form.prixAchat);
      if (!Number.isFinite(prix) || prix < 0) return setError("Le prix d'achat doit être un nombre positif ou nul.");
    }
    if (form.dateAcquisition !== '' && form.dateAcquisition > today())
      return setError("La date d'acquisition ne peut pas être dans le futur.");

    setSaving(true);
    try {
      const input = {
        reference: form.reference.trim(),
        marque: form.marque.trim() || null,
        modele: form.modele.trim() || null,
        numeroSerie: form.numeroSerie.trim() || null,
        dateAcquisition: form.dateAcquisition || null,
        prixAchat: form.prixAchat === '' ? null : Number(form.prixAchat),
        etat: form.etat,
        salleId: Number(form.salleId),
        typeId: Number(form.typeId),
      };
      const saved = equipement ? await updateEquipement(equipement.id, input) : await createEquipement(input);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err)); // ex. 409 : référence déjà utilisée
    } finally {
      setSaving(false);
    }
  };

  const missingLists = salles.length === 0 || types.length === 0;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal card" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <h3>{isNew ? 'Nouvel équipement' : "Modifier l'équipement"}</h3>
        {error && <div className="alert alert-error">{error}</div>}
        {missingLists && (
          <div className="alert alert-error">Créez d'abord au moins une salle et un type d'équipement.</div>
        )}

        <label>Référence (inventaire)</label>
        <input required value={form.reference} disabled={!isNew} onChange={(e) => set('reference', e.target.value)} />
        {!isNew && <p className="muted small">La référence n'est pas modifiable : le QR code déjà collé sur le matériel resterait valide.</p>}

        <div className="row">
          <div><label>Marque</label><input value={form.marque} onChange={(e) => set('marque', e.target.value)} /></div>
          <div><label>Modèle</label><input value={form.modele} onChange={(e) => set('modele', e.target.value)} /></div>
        </div>
        <label>Numéro de série</label>
        <input value={form.numeroSerie} onChange={(e) => set('numeroSerie', e.target.value)} />

        <div className="row">
          <div>
            <label>Date d'acquisition</label>
            <input type="date" max={today()} value={form.dateAcquisition} onChange={(e) => set('dateAcquisition', e.target.value)} />
          </div>
          <div>
            <label>Prix d'achat (DT)</label>
            <input type="number" min={0} step="0.01" value={form.prixAchat} onChange={(e) => set('prixAchat', e.target.value)} />
          </div>
        </div>

        <div className="row">
          <div>
            <label>Type</label>
            <select required value={form.typeId} onChange={(e) => set('typeId', e.target.value)}>
              <option value="">— Choisir —</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.libelle}</option>)}
            </select>
          </div>
          <div>
            <label>Salle</label>
            <select required value={form.salleId} onChange={(e) => set('salleId', e.target.value)}>
              <option value="">— Choisir —</option>
              {salles.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>
        </div>

        <label>État</label>
        <select value={form.etat} onChange={(e) => set('etat', e.target.value as EtatEquipement)}>
          {ETATS.map((s) => <option key={s} value={s}>{ETAT_LABELS[s]}</option>)}
        </select>

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={saving || missingLists}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
