import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { errorMessage } from '../api/client';
import { createType, deleteType, listTypes, updateType } from '../api/materiel';
import type { TypeEquipement } from '../api/types';

/** Gestion des types d'équipement (administrateur). */
export default function TypesPage() {
  const [types, setTypes] = useState<TypeEquipement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<TypeEquipement | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTypes(await listTypes());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const remove = async (t: TypeEquipement) => {
    if (!window.confirm(`Supprimer le type « ${t.libelle} » ?`)) return;
    setError('');
    try {
      await deleteType(t.id);
      await load();
    } catch (err) {
      setError(errorMessage(err)); // ex. 409 : des équipements utilisent ce type
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Types d'équipement</h1>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>+ Nouveau type</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card table-wrap">
        {loading ? <p className="muted pad">Chargement…</p> : (
          <table>
            <thead>
              <tr><th>Libellé</th><th>Maintenance tous les</th><th>Durée de vie estimée</th><th /></tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id}>
                  <td>{t.libelle}</td>
                  <td>{t.frequenceMaintenanceMois ? `${t.frequenceMaintenanceMois} mois` : '—'}</td>
                  <td>{t.dureeVieEstimeeMois ? `${t.dureeVieEstimeeMois} mois` : '—'}</td>
                  <td className="actions">
                    <button className="btn btn-small" onClick={() => setEditing(t)}>Modifier</button>
                    <button className="btn btn-small btn-outline" onClick={() => remove(t)}>Supprimer</button>
                  </td>
                </tr>
              ))}
              {types.length === 0 && <tr><td colSpan={4} className="muted">Aucun type.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <TypeModal
          type={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
        />
      )}
    </>
  );
}

const toText = (n: number | null | undefined): string => (n === null || n === undefined ? '' : String(n));

function TypeModal({ type, onClose, onSaved }: { type: TypeEquipement | null; onClose: () => void; onSaved: () => void }) {
  const [libelle, setLibelle] = useState(type?.libelle ?? '');
  const [frequence, setFrequence] = useState(toText(type?.frequenceMaintenanceMois ?? 6));
  const [duree, setDuree] = useState(toText(type?.dureeVieEstimeeMois));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isPositiveInt = (v: string) => v === '' || (Number.isInteger(Number(v)) && Number(v) > 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!libelle.trim()) return setError('Le libellé est obligatoire.');
    if (!isPositiveInt(frequence) || !isPositiveInt(duree)) return setError('Les durées doivent être des nombres entiers positifs.');
    setSaving(true);
    try {
      const input = {
        libelle: libelle.trim(),
        frequenceMaintenanceMois: frequence === '' ? null : Number(frequence),
        dureeVieEstimeeMois: duree === '' ? null : Number(duree),
      };
      if (type) await updateType(type.id, input);
      else await createType(input);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal card" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <h3>{type ? 'Modifier le type' : 'Nouveau type'}</h3>
        {error && <div className="alert alert-error">{error}</div>}
        <label>Libellé</label>
        <input required value={libelle} onChange={(e) => setLibelle(e.target.value)} />
        <div className="row">
          <div>
            <label>Fréquence de maintenance (mois)</label>
            <input type="number" min={1} step={1} value={frequence} onChange={(e) => setFrequence(e.target.value)} />
          </div>
          <div>
            <label>Durée de vie estimée (mois)</label>
            <input type="number" min={1} step={1} value={duree} onChange={(e) => setDuree(e.target.value)} />
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </div>
  );
}
