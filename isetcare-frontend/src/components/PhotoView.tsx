import { useEffect, useState } from 'react';
import { fetchPhoto } from '../api/reclamations';

/** Affiche la photo d'une réclamation (téléchargée via l'API avec le token JWT). */
export default function PhotoView({ reclamationId }: { reclamationId: number }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    fetchPhoto(reclamationId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob); // URL temporaire locale vers l'image
        setUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl); // libère la mémoire
    };
  }, [reclamationId]);

  if (failed) return <p className="muted">Photo indisponible.</p>;
  if (!url) return <p className="muted">Chargement de la photo…</p>;
  return <img className="photo" src={url} alt="Photo de la panne" />;
}
