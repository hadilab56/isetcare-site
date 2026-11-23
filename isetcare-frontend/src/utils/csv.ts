/** Télécharge un fichier CSV (séparateur ";" et BOM : s'ouvre correctement dans Excel en français). */
export function downloadCsv(filename: string, rows: (string | number | null)[][]): void {
  const esc = (v: string | number | null): string => {
    const s = v === null ? '' : String(v);
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '\uFEFF' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
