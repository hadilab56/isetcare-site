import type { StatLigne } from '../api/types';

interface Props {
  lignes: StatLigne[];
  unite?: string;
  vide?: string;
}

/** Diagramme à barres horizontales en HTML/CSS (aucune bibliothèque de graphiques). */
export default function BarList({ lignes, unite = '', vide = 'Aucune donnée.' }: Props) {
  if (lignes.length === 0) return <p className="muted">{vide}</p>;
  const max = Math.max(...lignes.map((l) => l.valeur), 1);
  return (
    <div className="bars">
      {lignes.map((l) => (
        <div className="bar-row" key={l.libelle}>
          <span className="bar-label">{l.libelle}</span>
          <div className="bar-track" role="img" aria-label={`${l.libelle} : ${l.valeur}${unite}`}>
            <div className="bar-fill" style={{ width: `${(l.valeur / max) * 100}%` }} />
          </div>
          <strong className="bar-value">{l.valeur.toLocaleString('fr-FR')}{unite}</strong>
        </div>
      ))}
    </div>
  );
}
