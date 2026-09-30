import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const args = process.argv.slice(2),
  opts = {};
if (args.includes('--help')) {
  console.log(
    'npm run simulate -- --games 1000 --players mixed --seed 1 --policy strategic --out artifacts/simulations/latest\nPlayers: 2, 3, 4, mixed. Policies: strategic, basic, compare (one strategic bot, rotating seats). Optional --max-actions 5000. Writes HTML, JSON, player CSV and statistics CSV. Failed games exit with code 1 and include replay actions.',
  );
  process.exit(0);
}
for (let i = 0; i < args.length; i += 2) {
  if (
    !['--games', '--players', '--seed', '--policy', '--out', '--max-actions'].includes(args[i]) ||
    !args[i + 1] ||
    args[i + 1].startsWith('--')
  )
    throw Error(`Unknown or incomplete option: ${args[i]}`);
  opts[args[i].slice(2)] = args[i + 1];
}
const server = await createServer({
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: 'custom',
});
try {
  const { runSimulation } = await server.ssrLoadModule('/src/simulation/runner.ts');
  const { renderReport, playerCSV, tablesCSV } = await server.ssrLoadModule(
    '/src/simulation/report.ts',
  );
  const config = {};
  for (const k of ['games', 'seed']) if (opts[k] !== undefined) config[k] = Number(opts[k]);
  if (opts.players !== undefined)
    config.players = opts.players === 'mixed' ? 'mixed' : Number(opts.players);
  if (opts.policy) config.policy = opts.policy;
  if (opts['max-actions']) config.maxActions = Number(opts['max-actions']);
  let cancel = false;
  const stop = () => {
    cancel = true;
  };
  process.on('SIGINT', stop);
  const report = await runSimulation(
    config,
    (n, total) => {
      if (n % 100 === 0 || n === total) console.log(`${n}/${total} games attempted`);
    },
    () => cancel,
  );
  process.off('SIGINT', stop);
  const out = resolve(opts.out ?? 'artifacts/simulations/latest');
  await mkdir(out, { recursive: true });
  await Promise.all([
    writeFile(resolve(out, 'report.html'), renderReport(report)),
    writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2)),
    writeFile(resolve(out, 'players.csv'), playerCSV(report)),
    writeFile(resolve(out, 'statistics.csv'), tablesCSV(report)),
  ]);
  console.log(
    `${report.completed} complete, ${report.failed} failed. Report: ${resolve(out, 'report.html')}`,
  );
  if (report.failed) process.exitCode = 1;
} finally {
  await server.close();
}
