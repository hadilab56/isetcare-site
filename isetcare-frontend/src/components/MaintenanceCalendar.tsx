import { STATUT_MAINT_LABELS, type Maintenance } from '../api/types';
import { isoDate } from '../utils/format';

interface Props {
  items: Maintenance[];
  month: Date; // n'importe quel jour du mois affiché
  onSelect: (m: Maintenance) => void;
}

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/** US24 : calendrier mensuel des maintenances (grille de 7 colonnes, la semaine commence le lundi). */
export default function MaintenanceCalendar({ items, month, onSelect }: Props) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const decalage = (new Date(year, m, 1).getDay() + 6) % 7; // 0 = lundi
  const nbJours = new Date(year, m + 1, 0).getDate();
  const cases: (number | null)[] = [...Array<null>(decalage).fill(null), ...Array.from({ length: nbJours }, (_, i) => i + 1)];
  while (cases.length % 7 !== 0) cases.push(null);
  const aujourdhui = isoDate(new Date());

  return (
    <div className="cal" role="grid" aria-label="Calendrier des maintenances">
      {JOURS.map((j) => <div key={j} className="cal-head">{j}</div>)}
      {cases.map((jour, idx) => {
        if (jour === null) return <div key={`v${idx}`} className="cal-day empty" />;
        const iso = isoDate(new Date(year, m, jour));
        const duJour = items.filter((i) => i.datePlanifiee === iso);
        return (
          <div key={iso} className={`cal-day${iso === aujourdhui ? ' today' : ''}`}>
            <span className="cal-num">{jour}</span>
            {duJour.map((i) => (
              <button key={i.id} type="button" className={`cal-chip maint-${i.statut}`}
                title={`${i.equipementReference} — ${STATUT_MAINT_LABELS[i.statut]}`} onClick={() => onSelect(i)}>
                {i.equipementReference}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
