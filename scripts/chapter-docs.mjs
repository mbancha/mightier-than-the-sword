import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const content = JSON.parse(readFileSync('src/data/chapters-content.json', 'utf8'));
const headings = { books: 'Books', characters: 'Characters', twists: 'Twists', subplots: 'Subplots', bookmarks: 'Bookmarks' };
const fields = {
  books: ['name', 'quantity', 'genre', 'icon', 'effect', 'page_space_1', 'page_space_2', 'page_space_3', 'page_space_4', 'page_space_5', 'page_space_6'],
  characters: ['name', 'quantity', 'genre', 'power', 'cost', 'type', 'abilityName', 'ability'],
  twists: ['name', 'quantity', 'genre', 'cost', 'effect'],
  subplots: ['name', 'quantity', 'genre', 'condition', 'ongoing', 'instant', 'power'],
  bookmarks: ['name', 'quantity', 'effect'],
};
const quote = (value) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
mkdirSync('print/component-studio', { recursive: true });
for (const [key, label] of Object.entries(headings)) {
  const columns = fields[key];
  const entries = content[key];
  if (entries.some((entry) => !entry.name || !Number.isInteger(entry.quantity) || entry.quantity < 1)
    || new Set(entries.map((entry) => entry.name)).size !== entries.length)
    throw Error('Invalid name or quantity in ' + label);
  const rows = entries.map((entry) => {
    const record = { ...entry };
    if (key === 'books') {
      record.icon = entry.category === 'combat' ? '⚔' : '◇';
      entry.spaces.forEach((space, i) => { record['page_space_' + (i + 1)] = space; });
    }
    return columns.map((column) => quote(record[column])).join(',');
  });
  writeFileSync('print/component-studio/' + label + '.csv', [columns.join(','), ...rows].join('\r\n') + '\r\n');
}
let text = readFileSync('docs/PLAYTEST_RULES.md', 'utf8') + '\n## Component reference\n';
text += '\nSource: [Mightier than the Sword spreadsheet](' + content.source + ').\n';
for (const [key, label] of Object.entries(headings)) {
  text += '\n### ' + label + '\n';
  for (const item of content[key]) {
    text += '\n**' + item.name + '** · ' + item.quantity + ' ' + (item.quantity === 1 ? 'copy' : 'copies') + '\n\n';
    if (key === 'books') text += (item.category === 'combat' ? '⚔ ' : '◇ ') + item.effect + '\n\n' + item.spaces.map((space, i) => (i + 1) + '. ' + space).join('\n') + '\n';
    if (key === 'characters') text += 'Power ' + item.power + '. **' + item.abilityName + '**' + (item.cost === null ? '' : ' (' + item.cost + ' ink)') + '. ' + item.ability + '\n';
    if (key === 'twists') text += item.cost + ' ink. ' + item.effect + '\n';
    if (key === 'subplots') text += item.condition + '\n\nKeep: ' + item.ongoing + '\n\nTake now: ' + item.instant + '\n';
    if (key === 'bookmarks') text += item.effect + '\n';
  }
}
writeFileSync('docs/RULES.md', text);
