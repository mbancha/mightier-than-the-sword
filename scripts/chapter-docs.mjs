import fs from 'node:fs';
const c = JSON.parse(fs.readFileSync('src/data/content.json', 'utf8')).redesign;
let text =
  '# Mightier than the Sword — Chapters edition\n\nDigital playtest content. PnP remains on its previous edition.\n\nSee CHAPTER_SPEC.md for confirmed rules and proposed operational defaults.\n\n';
text += '## Base rules\n\n' + c.baseRules.join('\n\n') + '\n\n';
for (const [title, items] of [
  ['Characters', c.characters],
  ['Twists', c.twists],
  ['Subplots', c.subplots],
]) {
  text += `## ${title}\n\n`;
  for (const d of items) {
    text += `### ${d.name} (${d.genre})\n\n`;
    if (title === 'Characters') text += `Power ${d.power}. ${d.ability}\n\n`;
    if (title === 'Twists') text += `Cost ${d.cost} ink. ${d.effect}\n\n`;
    if (title === 'Subplots')
      text += `${d.condition}\n\nChoose ongoing: ${d.ongoing}\n\nOr immediate: ${d.instant}\n\n`;
  }
}
text += '## Books\n\n';
const old = JSON.parse(fs.readFileSync('src/data/content.json', 'utf8'));
old.books.forEach((b, i) => {
  text += `### ${b.title}\n\n${c.bookEffects[i].category}: ${c.bookEffects[i].effect}\n\nMiddle spaces: ${c.bonuses[i]}\n\n`;
});
fs.writeFileSync('docs/RULES.md', text.trimEnd() + '\n');
