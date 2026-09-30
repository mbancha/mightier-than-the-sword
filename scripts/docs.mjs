import { readFile, writeFile } from 'node:fs/promises';
const c = JSON.parse(await readFile(new URL('../src/data/content.json', import.meta.url), 'utf8'));
await writeFile(
  new URL('../docs/RULES.md', import.meta.url),
  '# Mightier than the Sword — current rules\n\nGenerated from `src/data/content.json`. Source edition ' +
    c.edition +
    '. See DECISIONS.md for digital rulings.\n\n' +
    c.rules.map(([h, t]) => '## ' + h + '\n\n' + t).join('\n\n') +
    '\n',
);
console.log('Updated docs/RULES.md from shared content.');
