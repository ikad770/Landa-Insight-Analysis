self.onmessage = async (event) => {
  const { id, type, payload } = event.data || {};
  try {
    if (type === 'parseTextFile') {
      const { text = '', ext = '' } = payload || {};
      const rows = ext === 'csv' ? parseCSV(text) : parseJSON(text);
      self.postMessage({ id, ok: true, result: { rows, detected: detectDatasetType(rows) } });
      return;
    }
    if (type === 'processFile') {
      const { text = '', ext = 'csv', dataset = 'errors' } = payload || {};
      const rows = ext === 'csv' ? parseCSV(text) : parseJSON(text);
      const normalized = normalizeRows(rows, dataset);
      const aggregated = buildAggregations(normalized, dataset);
      self.postMessage({ id, ok: true, result: { rows, normalized, aggregated, detected: detectDatasetType(rows) } });
      return;
    }
    throw new Error(`Unknown worker command: ${type}`);
  } catch (error) {
    self.postMessage({ id, ok: false, error: error?.message || 'Worker failure' });
  }
};

function parseJSON(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('JSON must be an array of objects.');
  return data;
}
function detectDelimiter(text) {
  const lines = String(text).split(/\r?\n/).slice(0, 6);
  return [',', ';', '\t'].map(d => ({ d, s: lines.reduce((a, l) => a + (l.split(d).length - 1), 0) })).sort((a, b) => b.s - a.s)[0].d;
}
function parseCSV(text) {
  const src = String(text || '').replace(/^\uFEFF/, '');
  const delim = detectDelimiter(src);
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      row.push(field); field = '';
      if (row.some(v => String(v).trim())) rows.push(row);
      row = [];
      if (ch === '\r' && src[i + 1] === '\n') i++;
    } else field += ch;
  }
  if (field.length || row.length) { row.push(field); if (row.some(v => String(v).trim())) rows.push(row); }
  const headers = (rows[0] || []).map(h => String(h).trim());
  return rows.slice(1).map(cells => Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ''])));
}
function canonical(v) { return String(v ?? '').trim().toLowerCase(); }
function hasAnyField(row, aliases = []) {
  const keys = Object.keys(row || {}).map(canonical);
  return aliases.some(alias => keys.includes(canonical(alias)));
}
function detectDatasetType(rows = []) {
  const sample = rows.slice(0, 60);
  if (!sample.length) return 'unknown';
  const score = { errors: 0, availability: 0, volume: 0 };
  sample.forEach(row => {
    if (hasAnyField(row, ['Start Time', 'Start', 'Event Time', 'Timestamp']) && hasAnyField(row, ['Name', 'Alert Name', 'Alert Title'])) score.errors += 3;
    if (hasAnyField(row, ['Print']) || hasAnyField(row, ['Available Without Print'])) score.availability += 3;
    if (hasAnyField(row, ['Print Start']) || hasAnyField(row, ['Printed Sheets']) || hasAnyField(row, ['Printed Flats'])) score.volume += 3;
  });
  const winner = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return winner && winner[1] > 0 ? winner[0] : 'unknown';
}
function normalizeRows(rows = [], dataset = 'errors') { return rows.map(r => ({ ...r, __dataset: dataset })); }
function buildAggregations(rows = [], dataset = 'errors') { return { dataset, rowCount: rows.length }; }
