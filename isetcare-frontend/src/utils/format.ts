/** "2023-09-01" -> "01/09/2023" ; null -> "—" */
export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const prixFormat = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 1800 -> "1 800,00 DT" ; null -> "—" */
export function formatPrix(prix: number | null): string {
  return prix === null ? '—' : `${prixFormat.format(prix)} DT`;
}

/** Date du jour au format "AAAA-MM-JJ" (heure locale), pour limiter le champ date. */
export function today(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** "2026-11-15T17:30:12" -> "15/11/2026 17:30" */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Valeur initiale d'un champ <input type="datetime-local"> : maintenant, "AAAA-MM-JJThh:mm" (heure locale). */
export function nowLocalInput(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 95 -> "1 h 35" ; 40 -> "40 min" */
export function formatDuree(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

/** Date "AAAA-MM-JJ" d'un objet Date, en heure locale. */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
