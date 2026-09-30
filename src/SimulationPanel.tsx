import { useEffect, useRef, useState } from 'react';
import { DEFAULT_CONFIG, validateConfig, type Report } from './simulation/runner';
import { renderReport, playerCSV, tablesCSV, formatCell } from './simulation/report';
export function SimulationPanel() {
  const [games, setGames] = useState(1000),
    [players, setPlayers] = useState('mixed'),
    [seed, setSeed] = useState(1),
    [policy, setPolicy] = useState('strategic');
  const [running, setRunning] = useState(false),
    [stopping, setStopping] = useState(false),
    [progress, setProgress] = useState(0),
    [report, setReport] = useState<Report | null>(null),
    [error, setError] = useState('');
  const worker = useRef<Worker | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);
  const start = () => {
    try {
      const config = validateConfig({
        ...DEFAULT_CONFIG,
        games,
        players: players === 'mixed' ? 'mixed' : (+players as 2 | 3 | 4),
        seed,
        policy: policy as 'strategic' | 'basic' | 'compare',
      });
      worker.current?.terminate();
      const w = new Worker(new URL('./simulation/worker.ts', import.meta.url), { type: 'module' });
      worker.current = w;
      setRunning(true);
      setStopping(false);
      setProgress(0);
      setReport(null);
      setError('');
      w.onmessage = (e) => {
        if (e.data.type === 'progress') setProgress(e.data.attempted);
        if (e.data.type === 'done') {
          setReport(e.data.report);
          setRunning(false);
          w.terminate();
        }
        if (e.data.type === 'error') {
          setError(e.data.error);
          setRunning(false);
          w.terminate();
        }
      };
      w.onerror = (e) => {
        setError(e.message);
        setRunning(false);
        w.terminate();
      };
      w.postMessage({ type: 'start', config });
    } catch (e) {
      setError(String(e));
    }
  };
  const download = (filename: string, text: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="simulationPanel" aria-label="Balance simulation">
      <h2>Balance lab</h2>
      <p>
        Play thousands of bot games without drawing the board. Your current game is kept separate.
        Choose a repeatable seed to rerun an experiment.
      </p>
      <fieldset disabled={running}>
        <legend>Simulation settings</legend>
        <div className="simulationSettings">
          <label>
            Games
            <input
              type="number"
              min="1"
              max="100000"
              value={games}
              onChange={(e) => setGames(+e.target.value)}
            />
          </label>
          <label>
            Simulation players
            <select value={players} onChange={(e) => setPlayers(e.target.value)}>
              <option value="mixed">Mix 2, 3 and 4</option>
              {[2, 3, 4].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            First simulation seed
            <input type="number" min="0" value={seed} onChange={(e) => setSeed(+e.target.value)} />
          </label>
          <label>
            Bot policy
            <select value={policy} onChange={(e) => setPolicy(e.target.value)}>
              <option value="strategic">All strategic</option>
              <option value="basic">All original basic</option>
              <option value="compare">One strategic vs basic, rotating seats</option>
            </select>
          </label>
        </div>
      </fieldset>
      <button className="primary" disabled={running} onClick={start}>
        Run simulation
      </button>
      {running && (
        <button
          disabled={stopping}
          onClick={() => {
            setStopping(true);
            worker.current?.postMessage({ type: 'cancel' });
          }}
        >
          Stop and show partial results
        </button>
      )}
      <p role="status">
        {running
          ? `${stopping ? 'Stopping after the current batch' : 'Running'}: ${progress.toLocaleString()} / ${games.toLocaleString()} games attempted.`
          : report
            ? `${report.completed.toLocaleString()} completed · ${report.failed} failed · ${report.attempted} attempted${report.cancelled ? ' · stopped early' : ''}`
            : 'Default: 1,000 games. Results stay on this device; download them to keep or share.'}
      </p>
      {error && <p role="alert">{error}</p>}
      {report && (
        <>
          <div className="simulationDownloads">
            <button
              onClick={() =>
                download('mightier-simulation.html', renderReport(report), 'text/html')
              }
            >
              Download readable report
            </button>
            <button
              onClick={() =>
                download(
                  'mightier-simulation.json',
                  JSON.stringify(report, null, 2),
                  'application/json',
                )
              }
            >
              Download full JSON
            </button>
            <button
              onClick={() => download('mightier-player-games.csv', playerCSV(report), 'text/csv')}
            >
              Download player CSV
            </button>
            <button
              onClick={() => download('mightier-statistics.csv', tablesCSV(report), 'text/csv')}
            >
              Download statistics CSV
            </button>
          </div>
          <p>
            Rules {report.rulesVersion} · {report.botVersion} · seed {report.config.seed}. Ties
            split a win. These results reflect bot behavior, not proven balance: acquiring a
            character can follow earlier success. Read sample sizes and compare within a player
            count. Failed games are excluded from averages and retained in the JSON.
          </p>
          {report.tables.map((t, i) => (
            <details key={t.title} open={i === 0}>
              <summary>{t.title}</summary>
              <p>{t.description}</p>
              <div className="simulationTable">
                <table>
                  <thead>
                    <tr>
                      {t.columns.map((c) => (
                        <th scope="col" key={c.key}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r, k) => (
                      <tr key={k}>
                        {t.columns.map((c) => (
                          <td key={c.key}>{formatCell(r[c.key], c)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
          {report.failed > 0 && (
            <details>
              <summary>Failed seeds</summary>
              {report.games
                .filter((g) => g.status === 'failed')
                .map((g) => (
                  <p key={g.seed}>
                    Seed {g.seed} · {g.playerCount} players · {g.error}
                  </p>
                ))}
            </details>
          )}
        </>
      )}
    </section>
  );
}
