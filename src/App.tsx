import { useEffect, useRef, useState } from 'react';
import {
  content,
  books,
  twists,
  characters,
  subplots,
  tokens,
  ROWS,
  rowName,
  type Row,
} from './data/catalog';
import {
  createSession,
  advance,
  undo,
  exportSession,
  importSession,
  type Session,
} from './game/session';
import { currentPlayer, pageLabel } from './game/engine';
import { publicView, playerView } from './game/views';
import type { Choice } from './game/types';

const colors = content.players.map((p) => p.color);
function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return <img className="icon" src={`./icons/${name}.svg`} alt="" width={size} height={size} />;
}
const prompts: Record<string, string> = {
  setup: 'Choose a starting page for your protagonist.',
  move: 'Choose where to move. Staying is allowed.',
  turn: 'Take one action. You may also play one turn Twist.',
  place: 'Choose an empty space. Full pages use shared overflow.',
  upgrade: 'Choose a memory. Your Inkling is suspended to the next Act.',
  returnMemory: 'Return a memory to its row to draw a character.',
  horse: 'Choose a hidden Trojan Horse power for this Act.',
  subplot: 'Your Subplot is complete. Choose its reward.',
  battle: 'Play a conflict Twist or pass. Compare the live power totals below.',
  resolve: 'Choose which full book resolves next.',
  takeToken: 'Choose the new conflict token. Only an uncovered book scores its multiplier.',
  tokenRewards: 'Choose the order of this book’s token rewards.',
  moon: 'No supply Inklings: take each remaining token’s strong bonus, then advance the Act.',
  erase: 'Choose an Inkling to erase, or skip.',
  transfer: 'Move one of your Inklings from another book into overflow.',
  collect: 'Collect the erased Inkling on Frankenstein, or leave it in supply.',
  nemo: 'Move activation Inklings into this book’s overflow, or skip.',
  refresh: 'Return activation Inklings to supply, or skip.',
  discard: 'Discard to your Twist hand limit.',
  cycle: 'Discard a Twist to draw a Twist, or skip.',
  ignore: 'Choose an opposing character whose power is ignored.',
  bridge: 'Choose two adjoining pages on different books.',
  optionalForeshadow: 'You may foreshadow one Inkling from the next Act reserve.',
};
const storage = 'mightier-session-v1';
export default function App() {
  const [session, setSession] = useState<Session | null>(null),
    [names, setNames] = useState(['Teal', 'Amber', 'Rose', 'Violet']),
    [count, setCount] = useState(2),
    [seed, setSeed] = useState(() => Math.floor(Date.now() % 1000000)),
    [revealed, setRevealed] = useState<number | null>(null),
    [spectator, setSpectator] = useState(false),
    [selected, setSelected] = useState<Choice | null>(null),
    [group, setGroup] = useState('All'),
    [pageFilter, setPageFilter] = useState<number | null>(null),
    [rules, setRules] = useState(false),
    [catalog, setCatalog] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(() => !!localStorage.getItem(storage));
  const loadRef = useRef<HTMLInputElement>(null);
  const state = session?.history.at(-1),
    actor = state ? currentPlayer(state) : null;
  useEffect(() => {
    setSelected(null);
    setGroup('All');
    setPageFilter(null);
  }, [session]);
  useEffect(() => {
    setRevealed(null);
  }, [actor, spectator]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelected(null);
        setPageFilter(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  function dispatch(choice: Choice) {
    try {
      setSession(advance(session!, { key: choice.key }));
      setSelected(null);
      setError('');
    } catch (e) {
      setError(String(e));
    }
  }
  function save() {
    try {
      localStorage.setItem(storage, JSON.stringify(exportSession(session!)));
      setSaved(true);
      setError('Saved on this device. The save contains all hidden information.');
    } catch {
      setError('Could not save on this device. Use Download private save instead.');
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(exportSession(session!), null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mightier-private-save.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  function load(raw: unknown) {
    try {
      setSession(importSession(raw));
      setRevealed(null);
      setError('');
    } catch (e) {
      setError(String(e));
    }
  }
  const publicData = state ? publicView(state) : null;
  const view = state && revealed === actor && !spectator ? playerView(state, actor!) : null;
  const actions = view?.actions ?? [];
  const filtered = actions.filter(
    (a) =>
      (group === 'All' || a.group === group) &&
      (pageFilter === null || a.page === pageFilter || a.book === Math.floor(pageFilter / 2)),
  );
  return (
    <>
      <header className="masthead">
        <div>
          <div className="eyebrow">A shared story · digital playtest 0.1</div>
          <h1>Mightier than the Sword</h1>
        </div>
        <nav>
          <button onClick={() => setRules(!rules)}>{rules ? 'Close rules' : 'Rules'}</button>
          <button onClick={() => setCatalog(!catalog)}>
            {catalog ? 'Close library' : 'Card library'}
          </button>
        </nav>
      </header>
      {error && (
        <p role="status" className="notice">
          {error}
        </p>
      )}
      {rules && (
        <section className="reference">
          <h2>How to play</h2>
          <p>
            2–4 players · three Acts · highest plot points wins. This is a local hotseat prototype.
            Pass the device when prompted. Undo cannot undo knowledge.
          </p>
          {content.rules.map(([h, t]) => (
            <details key={h}>
              <summary>{h}</summary>
              <p>{t}</p>
            </details>
          ))}
          <p>
            Digital rulings: a character between books can act on either adjoining page. Returning a
            memory lowers its row. Subplot events from a completed card do not carry over. Opponent
            hands and unrevealed Horse powers are hidden during handoff.
          </p>
          <p>
            Playtest status: first automated build; designer validation and balance testing remain.
            No online multiplayer or bots.
          </p>
        </section>
      )}
      {catalog && (
        <section className="reference">
          <h2>Component library</h2>
          <p>
            Current printed edition v15. Live text comes from the same content file used for
            printing.
          </p>
          <div className="library">
            {twists.map((t) => (
              <article className="smallCard" key={'t' + t.id}>
                <span className="eyebrow">Twist · {t.timing}</span>
                <h3>{t.name}</h3>
                <p>{t.text}</p>
                <blockquote>“{t.quote}”</blockquote>
              </article>
            ))}
            {subplots.map((t) => (
              <article className="smallCard" key={'s' + t.id}>
                <span className="eyebrow">Subplot · {t.target} steps</span>
                <h3>{t.name}</h3>
                <p>{t.text}</p>
                <p>Draw a character OR {t.reward} Then draw a new Subplot.</p>
              </article>
            ))}
            {characters.map((c) => (
              <article className="smallCard" key={'c' + c.id}>
                <span className="eyebrow">
                  {c.genre} · power {c.power}
                </span>
                <h3>{c.name}</h3>
                {c.actions.map(([n, t], i) => (
                  <p key={i}>
                    {n} activation spaces: {t}
                  </p>
                ))}
                {c.passive && <p>{c.passive[1]}</p>}
              </article>
            ))}
            {content.horse.map(([name, text]) => (
              <article className="smallCard" key={name}>
                <span className="eyebrow">Trojan Horse power</span>
                <h3>{name}</h3>
                <p>{text}</p>
              </article>
            ))}
            {tokens.map((t) => (
              <article className="smallCard" key={'token' + t.id}>
                <span className="eyebrow">
                  Act {t.act} conflict token · ×{t.act}
                </span>
                <h3>{t.name}</h3>
                <p>{t.text}</p>
                <p>Weak side: {t.act} plot points.</p>
              </article>
            ))}
          </div>
        </section>
      )}
      {!session ? (
        <main className="setup">
          <section>
            <Icon name="protagonist" size={64} />
            <h2>Open a new chapter</h2>
            <p>
              Move between pages, leave memories, enlist literary characters, and win conflicts
              across nine books.
            </p>
            <label>
              Players
              <select value={count} onChange={(e) => setCount(+e.target.value)}>
                {[2, 3, 4].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            {names.slice(0, count).map((n, i) => (
              <label key={i}>
                Player {i + 1}
                <input
                  value={n}
                  maxLength={40}
                  onChange={(e) =>
                    setNames(names.map((old, k) => (k === i ? e.target.value : old)))
                  }
                />
              </label>
            ))}
            <label>
              Shuffle seed
              <input type="number" value={seed} onChange={(e) => setSeed(+e.target.value)} />
            </label>
            <button
              className="primary"
              onClick={() => {
                try {
                  setSession(createSession({ names: names.slice(0, count), seed }));
                  setError('');
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              Begin story
            </button>
            <p className="muted">Hotseat · one device · private hands · undo and save</p>
            {saved && (
              <button
                onClick={() => {
                  try {
                    load(JSON.parse(localStorage.getItem(storage)!));
                  } catch (e) {
                    setError(String(e));
                  }
                }}
              >
                Resume saved story
              </button>
            )}
            <button onClick={() => loadRef.current?.click()}>Load private save</button>
          </section>
          <aside>
            <h2>Three ways to shape the story</h2>
            <p>
              <b>Place Inklings</b> to build power and fill books.
            </p>
            <p>
              <b>Leave memories</b> to improve your player board and share rewards.
            </p>
            <p>
              <b>Activate characters</b> to change the course of a conflict.
            </p>
            <div className="genreTags">
              <span>Voyages</span>
              <span>Epics</span>
              <span>Gothic Horror</span>
            </div>
            <p className="muted">
              First automated prototype. All source components are included; rules fidelity is still
              being checked through playtesting.
            </p>
          </aside>
        </main>
      ) : (
        <main className="game">
          <section className="toolbar">
            <strong>
              Act {state!.act} / III · Turn {state!.turn}
            </strong>
            <div>
              <button
                onClick={() => {
                  setSession(undo(session));
                  setRevealed(null);
                }}
                disabled={session.history.length < 2}
              >
                Undo
              </button>
              <button onClick={save}>Save locally</button>
              <button onClick={download}>Download private save</button>
              <button onClick={() => loadRef.current?.click()}>Load</button>
              <button onClick={() => setSpectator(!spectator)}>
                {spectator ? 'Return to players' : 'Spectator view'}
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Start another story? Save this one first if you want to keep it.',
                    )
                  ) {
                    setSession(null);
                    setRevealed(null);
                  }
                }}
              >
                New story
              </button>
            </div>
          </section>
          <section className="players" aria-label="Players">
            {publicData!.players.map((p, i) => (
              <article
                className={`player ${i === actor ? 'current' : ''}`}
                key={i}
                style={{ borderColor: colors[i] }}
              >
                <h2>
                  <Icon name={content.players[i].icon} />
                  {p.name}
                  {i === actor ? ' · choosing' : ''}
                </h2>
                <div className="resources">
                  <span>
                    <Icon name="points" />
                    {p.points} points
                  </span>
                  <span>
                    <Icon name="inkling" />
                    {p.supply} supply
                  </span>
                  <span>
                    II: {p.reserves[1]} · III: {p.reserves[2]}
                  </span>
                  <span>{p.handCount} Twists</span>
                </div>
                <div className="rows">
                  {ROWS.map((row) => (
                    <span key={row} title={String(content.tracks[ROWS.indexOf(row)][4])}>
                      <Icon name={row} />
                      {rowName(row)} {p.rows[row]}/3
                    </span>
                  ))}
                </div>
                <p className="muted">
                  Move {p.rows.curiosity + 1} · Power {p.rows.valor} · Hand limit{' '}
                  {3 + p.rows.insight} · Place {p.rows.resolve >= 2 ? p.rows.resolve : 1}
                  {p.rows.resolve === 1 ? ' (or discard to place 2)' : ''}
                </p>
                {p.subplot !== null && (
                  <details>
                    <summary>
                      {subplots[p.subplot].name} · {p.progress}/{subplots[p.subplot].target}
                    </summary>
                    <p>{subplots[p.subplot].text}</p>
                    <p>Draw a character OR {subplots[p.subplot].reward}</p>
                  </details>
                )}
              </article>
            ))}
          </section>
          {state!.over ? (
            <section className="ending">
              <Icon name="points" size={46} />
              <h2>Fin</h2>
              <p>
                {state!.players
                  .filter((p) => p.points === Math.max(...state!.players.map((p) => p.points)))
                  .map((p) => p.name)
                  .join(' & ')}{' '}
                win
                {state!.players.filter(
                  (p) => p.points === Math.max(...state!.players.map((p) => p.points)),
                ).length === 1
                  ? 's'
                  : ''}{' '}
                with {Math.max(...state!.players.map((p) => p.points))} plot points.
              </p>
              <p>Save this story to keep a replay for your next design session.</p>
            </section>
          ) : !view && !spectator ? (
            <section className="handoff">
              <h2>Pass to {publicData!.players[actor!].name}</h2>
              <p>Other players should look away before revealing this hand.</p>
              <button className="primary" onClick={() => setRevealed(actor)}>
                I’m {publicData!.players[actor!].name} · reveal my hand
              </button>
            </section>
          ) : null}
          <div className="table">
            <section className="books" aria-label="Nine books">
              {publicData!.books.map((b, bi) => {
                const def = books[b.id];
                return (
                  <article
                    key={bi}
                    className={`book ${state!.battle?.book === bi ? 'fighting' : ''}`}
                    data-genre={def.genre}
                  >
                    <div className="bookTitle">
                      <div>
                        <span className="eyebrow">{def.genre}</span>
                        <h3>{def.title}</h3>
                        <em>{def.where}</em>
                      </div>
                      <div className="vpSpace">
                        <Icon name="points" />
                        {b.covered ? 'Covered' : '+3'}
                        <small>{b.covered ? 'No book points' : '× new token'}</small>
                      </div>
                    </div>
                    <p className="bookEffect">
                      <Icon
                        name={def.timing.includes('CONFLICT') ? 'conflict' : 'ongoing'}
                        size={17}
                      />
                      <b>{def.timing.toLowerCase()}</b> · {def.effect}
                    </p>
                    <div className="pages">
                      {[0, 1].map((side) => {
                        const page = bi * 2 + side;
                        return (
                          <div
                            className={`page ${pageFilter === page ? 'selected' : ''}`}
                            key={side}
                          >
                            <button
                              className="pageLabel"
                              disabled={!view}
                              onClick={() => {
                                setPageFilter(page);
                                setGroup('All');
                              }}
                            >
                              {side === 0 ? 'Left' : 'Right'} page
                              {actions.some((a) => a.page === page) ? ' · choose' : ''}
                            </button>
                            <div className="figures">
                              {publicData!.players.map((p, i) =>
                                p.page === page ? (
                                  <span
                                    key={'p' + i}
                                    className="figure"
                                    style={{ borderColor: colors[i] }}
                                    title={p.name}
                                  >
                                    <Icon name="protagonist" />
                                    {p.name}
                                  </span>
                                ) : null,
                              )}
                              {publicData!.characters
                                .filter((c) => c.page === page || c.other === page)
                                .map((c) => (
                                  <span
                                    className="figure"
                                    key={'c' + c.id}
                                    style={{ borderColor: colors[c.owner] }}
                                  >
                                    {characters[c.id].name}
                                  </span>
                                ))}
                            </div>
                            <div className="slots">
                              {b.slots.map((spot, k) =>
                                spot.page === side ? (
                                  <div
                                    className="slot"
                                    key={k}
                                    title={`Space ${k + 1}${spot.memory ? ' · ' + rowName(spot.memory.row) + ' memory from ' + publicData!.players[spot.memory.owner].name : ''}`}
                                  >
                                    <small>{k + 1}</small>
                                    {spot.memory && (
                                      <span
                                        className="memory"
                                        style={{ borderColor: colors[spot.memory.owner] }}
                                      >
                                        <Icon name={spot.memory.row} />
                                      </span>
                                    )}
                                    {spot.owner !== null && (
                                      <span
                                        className="piece"
                                        style={{ background: colors[spot.owner] }}
                                        aria-label={`${publicData!.players[spot.owner].name}'s Inkling`}
                                      >
                                        {spot.owner + 1}
                                      </span>
                                    )}
                                  </div>
                                ) : null,
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="overflow">
                      <b>{b.id === 0 ? 'No overflow' : 'Shared overflow'}</b>
                      {b.overflow.map((n, p) =>
                        n ? (
                          <span key={p} style={{ color: colors[p] }}>
                            {publicData!.players[p].name}: {n}
                          </span>
                        ) : null,
                      )}
                    </div>
                    <div className="bookTokens">
                      {b.tokens.map((t) => (
                        <span
                          key={t.id}
                          title={t.strong ? tokens[t.id].text : `${tokens[t.id].act} plot points`}
                        >
                          Act {tokens[t.id].act} · {tokens[t.id].name} ·{' '}
                          {t.strong ? 'strong' : `${tokens[t.id].act} PP`}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </section>
            <aside className="actionPanel">
              <section>
                <h2>Available conflict tokens</h2>
                <div className="tokenPool">
                  {state!.pools[state!.act - 1].map((id) => (
                    <div key={id}>
                      <b>{tokens[id].name}</b>
                      <p>{tokens[id].text}</p>
                      <small>
                        Act {tokens[id].act} · ×{tokens[id].act}
                      </small>
                    </div>
                  ))}
                </div>
              </section>
              {publicData!.battle && (
                <section className="battle">
                  <h2>Conflict power</h2>
                  {publicData!.battle.participants.map((p) => (
                    <p key={p}>
                      <b>{publicData!.players[p].name}</b> {publicData!.battle!.powers[p]}
                    </p>
                  ))}
                </section>
              )}
              {view && !state!.over && (
                <section className="choices" aria-live="polite">
                  <div className="eyebrow">{publicData!.players[actor!].name}'s choice</div>
                  <h2>{prompts[view.prompt] ?? 'Resolve the next effect.'}</h2>
                  <div className="filters">
                    {['All', ...new Set(actions.map((a) => a.group))].map((g) => (
                      <button
                        key={g}
                        className={g === group ? 'chosen' : ''}
                        onClick={() => {
                          setGroup(g);
                          setSelected(null);
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  {pageFilter !== null && (
                    <button onClick={() => setPageFilter(null)}>Show all locations ×</button>
                  )}
                  {selected ? (
                    <div className="confirmation">
                      <h3>{selected.label}</h3>
                      <p>{selected.detail}</p>
                      <button className="primary" onClick={() => dispatch(selected)}>
                        Confirm choice
                      </button>
                      <button onClick={() => setSelected(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div className="actionList">
                      {filtered.length === 0 && (
                        <p>No choices here. Select “Show all locations” to continue.</p>
                      )}
                      {filtered.map((a) => (
                        <button key={a.key} onClick={() => setSelected(a)}>
                          <b>{a.label}</b>
                          {a.detail && <small>{a.detail}</small>}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}
              {view && (
                <section className="hand">
                  <h2>Your Twists</h2>
                  {view.hand.length === 0 && <p>No Twists in hand.</p>}
                  {view.hand.map((id) => (
                    <article key={id} className="handCard">
                      <span className="eyebrow">{twists[id].timing}</span>
                      <h3>{twists[id].name}</h3>
                      <p>{twists[id].text}</p>
                    </article>
                  ))}
                  {view.horse !== null && (
                    <article className="handCard">
                      <h3>Hidden Horse power</h3>
                      <p>
                        {content.horse[view.horse][0]} ·{' '}
                        {publicData!.players[actor!].horseSpent ? 'spent this Act' : 'ready'}
                      </p>
                    </article>
                  )}
                </section>
              )}
            </aside>
          </div>
          <section className="characterTable">
            <h2>Characters in the story</h2>
            <div className="library">
              {publicData!.characters.map((c) => (
                <article
                  className="smallCard"
                  style={{ borderTopColor: colors[c.owner] }}
                  key={c.id}
                >
                  <span className="eyebrow">
                    {publicData!.players[c.owner].name} · Power{' '}
                    {c.id === 1 && c.collected === 3 ? 5 : characters[c.id].power}
                  </span>
                  <h3>{characters[c.id].name}</h3>
                  <p className="muted">{pageLabel(state!, c.page)}</p>
                  {characters[c.id].actions.map(([max, t], i) => (
                    <p key={i}>
                      <b>
                        {c.used[i]}/{max} occupied
                      </b>{' '}
                      · {t}
                    </p>
                  ))}
                  {characters[c.id].collection > 0 && <p>Collected Inklings: {c.collected}/3</p>}
                  {characters[c.id].passive && <p>{characters[c.id].passive![1]}</p>}
                </article>
              ))}
            </div>
          </section>
          <details className="log">
            <summary>Story log · {publicData!.log.length} events</summary>
            <ol>
              {publicData!.log
                .slice()
                .reverse()
                .map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
            </ol>
          </details>
        </main>
      )}
      <input
        hidden
        type="file"
        accept="application/json,.json"
        ref={loadRef}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file)
            try {
              load(JSON.parse(await file.text()));
            } catch (err) {
              setError(String(err));
            }
          e.target.value = '';
        }}
      />
      <footer>
        Shared design workspace · source edition v15 · local hotseat privacy protects the screen,
        not the device’s stored data.
      </footer>
    </>
  );
}
