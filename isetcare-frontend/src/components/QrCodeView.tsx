import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { Equipement } from '../api/types';

interface Props {
  equipement: Equipement;
  onClose: () => void;
}

/**
 * Étiquette QR code d'un équipement : génération dans le navigateur (aucun appel serveur),
 * téléchargement PNG et impression (seule la zone .print-area est imprimée, voir styles.css).
 */
export default function QrCodeView({ equipement, onClose }: Props) {
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');
  const content = equipement.qrCode || `ISETCARE:${equipement.reference}`;

  // Pendant l'affichage de l'étiquette, l'impression ne doit sortir que l'étiquette (voir styles.css)
  useEffect(() => {
    document.body.classList.add('printing-qr');
    return () => document.body.classList.remove('printing-qr');
  }, []);

  useEffect(() => {
    let cancelled = false; // évite de mettre à jour l'état si la fenêtre est fermée entre-temps
    QRCode.toDataURL(content, { width: 320, margin: 2, errorCorrectionLevel: 'M' })
      .then((url) => { if (!cancelled) setDataUrl(url); })
      .catch(() => { if (!cancelled) setError('Impossible de générer le QR code.'); });
    return () => { cancelled = true; };
  }, [content]);

  const description = [equipement.marque, equipement.modele].filter(Boolean).join(' ');

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal card qr-modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3>QR code — {equipement.reference}</h3>
        {error && <div className="alert alert-error">{error}</div>}

        {dataUrl && (
          <div className="print-area qr-label">
            <img src={dataUrl} alt={`QR code de ${equipement.reference}`} />
            <strong>{equipement.reference}</strong>
            {description && <span>{description}</span>}
            {equipement.salleNom && <span>{equipement.salleNom}</span>}
            <small>{content}</small>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Fermer</button>
          {dataUrl && (
            <>
              <a className="btn" href={dataUrl} download={`qr-${equipement.reference}.png`}>Télécharger (PNG)</a>
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>Imprimer</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
