import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { Building2, PlusCircle, Search,  Edit, Trash2, X, Check } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import type { Salle } from '../api/types';

export default function SallesPage() {
  const [salles, setSalles] = useState<Salle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Ajout / Édition inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [nom, setNom] = useState('');
  const [batiment, setBatiment] = useState('');
  const [etage, setEtage] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSalles = () => {
    setLoading(true);
    api
      .get<Salle[]>('/salles')
      .then((res) => setSalles(res.data))
      .catch((err) => setError(errorMessage(err, 'Impossible de charger les salles.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSalles();
  }, []);

  const resetForm = () => {
    setNom('');
    setBatiment('');
    setEtage('');
    setEditingId(null);
    setShowAdd(false);
  };

  const startEdit = (s: Salle) => {
    setShowAdd(false);
    setEditingId(s.id);
    setNom(s.nom);
    setBatiment(s.batiment ?? '');
    setEtage(s.etage !== null ? String(s.etage) : '');
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      nom: nom.trim(),
      batiment: batiment.trim() || null,
      etage: etage !== '' ? Number(etage) : null,
    };

    try {
      if (editingId) {
        await api.put(`/salles/${editingId}`, payload);
      } else {
        await api.post('/salles', payload);
      }
      resetForm();
      fetchSalles();
    } catch (err) {
      setError(errorMessage(err, 'Erreur lors de l’enregistrement de la salle.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, salleNom: string) => {
    if (!window.confirm(`Supprimer la salle "${salleNom}" ?`)) return;
    try {
      await api.delete(`/salles/${id}`);
      fetchSalles();
    } catch (err) {
      setError(errorMessage(err, 'Impossible de supprimer cette salle (des équipements y sont peut-être rattachés).'));
    }
  };

  const filtered = useMemo(() => {
    return salles.filter(
      (s) =>
        s.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.batiment && s.batiment.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [salles, searchTerm]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Salles & Bâtiments</h1>
          <p className="dashboard-subtitle">Localisation physique des équipements au sein de l'établissement.</p>
        </div>

        <button
          type="button"
          className="btn-primary-pro"
          onClick={() => {
            resetForm();
            setShowAdd(!showAdd);
          }}
        >
          {showAdd ? <X size={18} /> : <PlusCircle size={18} />}
          <span>{showAdd ? 'Annuler' : 'Nouvelle salle'}</span>
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {(showAdd || editingId !== null) && (
        <form onSubmit={handleSave} className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <h3>{editingId ? 'Modifier la salle' : 'Ajouter une nouvelle salle'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Nom de la salle *</label>
              <input placeholder="Ex: Labo Réseaux" value={nom} onChange={(e) => setNom(e.target.value)} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Bâtiment / Bloc</label>
              <input placeholder="Ex: Bloc B" value={batiment} onChange={(e) => setBatiment(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Étage</label>
              <input type="number" placeholder="Ex: 1" value={etage} onChange={(e) => setEtage(e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={resetForm}>Annuler</button>
            <button type="submit" className="primary" disabled={saving}>
              <Check size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      <div className="panel-card">
        <div className="panel-header">
          <div>
            <h2>Répertoire des locaux</h2>
            <p className="panel-sub">{filtered.length} salle(s) répertoriée(s)</p>
          </div>
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher une salle ou bâtiment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Chargement...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {filtered.map((s) => (
              <div
                key={s.id}
                className="card"
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="kpi-icon-wrapper blue" style={{ width: '40px', height: '40px' }}>
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{s.nom}</h3>
                      <span className="sub-text">
                        {s.batiment ? `Bâtiment ${s.batiment}` : 'Bâtiment non précisé'}
                        {s.etage !== null ? ` • Étage ${s.etage}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                  <button type="button" className="btn" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }} onClick={() => startEdit(s)}>
                    <Edit size={14} /> Modifier
                  </button>
                  <button type="button" className="btn danger" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }} onClick={() => handleDelete(s.id, s.nom)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}