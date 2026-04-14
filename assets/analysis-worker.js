self.onmessage = (event) => {
  const { id, type, payload } = event.data || {};
  try {
    if (type === 'parseTextFile') {
      const { text = '', ext = '' } = payload || {};
      let rows = [];
      if (ext === 'csv') rows = parseCSV(text);
      else if (ext === 'json') rows = parseJSON(text);
      else throw new Error(`Unsupported worker parse type: ${ext}`);
      const detected = detectDatasetType(rows);
      self.postMessage({ id, ok: true, result: { rows, detected } });
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

function hasAnyField(row, aliases = []) {
  const keys = Object.keys(row || {});
  const lc = keys.map(k => String(k).toLowerCase().trim());
  return aliases.some(alias => lc.includes(String(alias).toLowerCase().trim()));
}

function detectDatasetType(rows = []) {
  const sample = rows.slice(0, 60);
  if (!sample.length) return 'unknown';
  const score = { errors: 0, availability: 0, volume: 0, salesforceCases: 0, salesforceParts: 0 };
  sample.forEach(row => {
    if (hasAnyField(row, ['Start Time', 'Start', 'Event Time', 'Timestamp']) && hasAnyField(row, ['Name', 'Alert Name', 'Alert Title'])) score.errors += 3;
    if (hasAnyField(row, ['Subsystem', 'Module'])) score.errors += 1;
    if (hasAnyField(row, ['Duration', 'Duration (sec)', 'DurationSeconds'])) score.errors += 1;
    if (hasAnyField(row, ['Print']) || hasAnyField(row, ['Available Without Print'])) score.availability += 3;
    if (hasAnyField(row, ['Preventive Maintenance']) || hasAnyField(row, ['On Job Maintenance']) || hasAnyField(row, ['Recovery']) || hasAnyField(row, ['Jams'])) score.availability += 3;
    if (hasAnyField(row, ['Availability'])) score.availability += 1;
    if (hasAnyField(row, ['Print Start']) || hasAnyField(row, ['Printed Sheets']) || hasAnyField(row, ['Printed Flats'])) score.volume += 3;
    if (hasAnyField(row, ['Job Type', 'Job Status', 'Press Mode'])) score.volume += 1;
    if (hasAnyField(row, ['Case Number', 'Case', 'Case Id']) || hasAnyField(row, ['Case Tier', 'Tier', 'Severity'])) score.salesforceCases += 3;
    if (hasAnyField(row, ['Part Number', 'Part #', 'SKU'])) score.salesforceParts += 3;
  });
  const winner = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return winner && winner[1] > 0 ? winner[0] : 'unknown';
}
