import type { Report, Table, Column } from './runner';
export const formatCell = (v: string | number | null | undefined, c: Column) =>
  v === null || v === undefined
    ? '—'
    : typeof v === 'number'
      ? c.format === 'percent'
        ? `${(v * 100).toFixed(1)}%`
        : c.format === 'decimal'
          ? v.toFixed(2)
          : String(v)
      : v;
const escape = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export function renderTable(t: Table) {
  return `<h2>${escape(t.title)}</h2><p>${escape(t.description)}</p><div class="scroll"><table><thead><tr>${t.columns.map((c) => `<th>${escape(c.label)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${t.columns.map((c) => `<td>${escape(formatCell(r[c.key], c))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
export function renderReport(r: Report) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mightier simulation report</title><style>body{font:16px/1.5 system-ui;color:#243d48;background:#faf8f1;margin:32px auto;padding:0 24px;max-width:1500px}h1,h2{font-family:Georgia}h2{margin-top:40px}table{border-collapse:collapse;width:100%;background:white;font-size:14px}th,td{padding:9px 12px;border-bottom:1px solid #d4dedb;text-align:right;white-space:nowrap}th{background:#e4efe8}td:nth-child(2){text-align:left}.scroll{overflow:auto}.notice{padding:18px;background:#ece5ce}a{color:#1b675d}</style><h1>Mightier than the Sword · Simulation report</h1><p><strong>${r.completed.toLocaleString()} completed</strong> / ${r.attempted.toLocaleString()} attempted / ${r.config.games.toLocaleString()} requested · ${r.failed} failed${r.cancelled ? ' · stopped early' : ''}</p><p>Rules ${escape(r.rulesVersion)} · Bot ${escape(r.botVersion)} · Catalog ${escape(r.catalogFingerprint)}<br>Players: ${r.config.players} · Policy: ${r.config.policy} · First seed: ${r.config.seed} · Decision cap: ${r.config.maxActions}</p><p class="notice">These are bot-policy diagnostics, not proof of balance. Ownership and completion correlate with prior success. Different cards are not assigned at random except starting Subplots. Inspect sample sizes, player counts and seat results before drawing conclusions. Zero samples show —. Win share splits ties; association rows are not mutually exclusive. Failed games are excluded from all tables and retained with seed and replay actions in JSON.</p>${r.tables.map(renderTable).join('')}${
    r.failed
      ? `<h2>Failed games</h2><ul>${r.games
          .filter((g) => g.status === 'failed')
          .map((g) => `<li>Seed ${g.seed}, ${g.playerCount} players: ${escape(g.error)}</li>`)
          .join('')}</ul>`
      : ''
  }</html>`;
}
const csvCell = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
export function playerCSV(r: Report) {
  const keys = [
    'seed',
    'playerCount',
    'seat',
    'policy',
    'points',
    'winShare',
    'turns',
    'upgrades',
    'subplotsCompleted',
    'conflicts',
    'conflictWins',
    'placements',
    'overflowPlacements',
    'foreshadowed',
    'erasures',
    'memoryRewards',
    'moons',
    'startingSubplot',
    'characters',
    'completed',
  ];
  return [
    keys.join(','),
    ...r.games
      .filter((g) => g.status === 'complete')
      .flatMap((g) =>
        g.players.map((p) =>
          keys
            .map((k) =>
              csvCell(
                k === 'seed'
                  ? g.seed
                  : k === 'playerCount'
                    ? g.playerCount
                    : Array.isArray(p[k as keyof typeof p])
                      ? JSON.stringify(p[k as keyof typeof p])
                      : p[k as keyof typeof p],
              ),
            )
            .join(','),
        ),
      ),
  ].join('\n');
}
export function tablesCSV(r: Report) {
  return [
    'table,players,name,metric,value',
    ...r.tables.flatMap((t) =>
      t.rows.flatMap((row) =>
        t.columns
          .filter((c) => !['name', 'players'].includes(c.key))
          .map((c) =>
            [t.title, row.players, row.name ?? '', c.label, row[c.key]].map(csvCell).join(','),
          ),
      ),
    ),
  ].join('\n');
}
