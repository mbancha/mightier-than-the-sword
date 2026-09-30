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
import { TableMap } from './TableMap';
import { chooseBotAction } from './game/bot';
import type { Choice } from './game/types';

const colors = content.players.map((p) => p.color);
function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return <img className="icon" src={`./icons/${name}.svg`} alt="" width={size} height={size} />;
}
const prompts: Record<string, string> = {
  publish: 'Place the drawn book touching at least two books.',
  publishOverflow: 'Place an Inkling in a neighboring book’s overflow.',
  setup: 'Choose a starting page for your protagonist.',
  move: 'Move your figure to a highlighted page.',
  turn: 'Click an empty space to place, or your Inkling to leave a memory.',
  place: 'Choose an empty space. Full pages use shared overflow.',
  upgrade: 'Choose a memory. Your Inkling is suspended to the next Act.',
  returnMemory: 'Return a memory to its row to draw a character.',
  horse: 'Choose a hidden Trojan Horse power for this Act.',
  subplot: 'Your Subplot is complete. Choose its reward.',
  battle: 'Your Inkling is being checked. Play a Twist from your hand or pass this space.',
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
    [controllers, setControllers] = useState<('human' | 'bot')[]>(['human', 'bot', 'bot', 'bot']),
    [botsPaused, setBotsPaused] = useState(false),
    [botDelay, setBotDelay] = useState(650),
    [contextMenu, setContextMenu] = useState<{ title: string; choices: Choice[] } | null>(null),
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
    setContextMenu(null);
    setSelected(null);
    setGroup('All');
    setPageFilter(null);
  }, [session]);
  useEffect(() => {
    setRevealed(null);
  }, [actor, spectator]);
  useEffect(() => {
    if (
      !session ||
      !state ||
      state.over ||
      botsPaused ||
      state.players[actor!].controller !== 'bot'
    )
      return;
    const timer = setTimeout(() => {
      try {
        setSession(
          advance(session, {
            key: chooseBotAction(playerView(state, actor!), session.actions.length).key,
          }),
        );
        setError('');
      } catch (e) {
        setError(String(e));
        setBotsPaused(true);
      }
    }, botDelay);
    return () => clearTimeout(timer);
  }, [session, botsPaused, botDelay]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelected(null);
        setContextMenu(null);
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
  const humans = state?.players.flatMap((p, i) => (p.controller === 'human' ? [i] : [])) ?? [];
  const singleHuman = humans.length === 1;
  const viewer = singleHuman ? humans[0] : revealed;
  const view =
    state &&
    !spectator &&
    viewer !== null &&
    (singleHuman || (viewer === actor && state.players[actor!].controller === 'human'))
      ? playerView(state, viewer)
      : null;
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
          <div className="eyebrow">A shared story · digital playtest 0.3</div>
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
            Basic bots are available; online multiplayer is not included.
          </p>
        </section>
      )}
      {catalog && (
        <section className="reference">
          <h2>Component library</h2>
          <p>Current edition 0.3. Live text comes from the same content file used for printing.</p>
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
              Move between pages, leave memories, enlist literary characters, and win conflicts on a
              growing map of books.
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
            {names.slice(0, count).map((n, i) => (
              <label key={'controller' + i}>
                {n || `Player ${i + 1}`} controls
                <select
                  aria-label={`Player ${i + 1} controller`}
                  value={controllers[i]}
                  onChange={(e) =>
                    setControllers(
                      controllers.map((old, k) =>
                        k === i ? (e.target.value as 'human' | 'bot') : old,
                      ),
                    )
                  }
                >
                  <option value="human">Human</option>
                  <option value="bot">Basic bot</option>
                </select>
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
                  setBotsPaused(false);
                  setSession(
                    createSession({
                      names: names.slice(0, count),
                      seed,
                      controllers: controllers.slice(0, count),
                    }),
                  );
                  setError('');
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              Begin story
            </button>
            <p className="muted">Play against bots or share the device · undo and save</p>
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
                  setBotsPaused(true);
                  setSession(undo(session));
                  setRevealed(null);
                }}
                disabled={session.history.length < 2}
              >
                Undo
              </button>
              <select
                aria-label="Bot speed"
                value={botDelay}
                onChange={(e) => setBotDelay(+e.target.value)}
              >
                <option value={650}>Normal bots</option>
                <option value={150}>Fast bots</option>
              </select>
              <button onClick={() => setBotsPaused(!botsPaused)}>
                {botsPaused ? 'Resume bots' : 'Pause bots'}
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
                  {p.controller === 'bot' ? ' · bot' : ''}
                  {i === actor ? ' · choosing' : ''}
                </h2>
                <div className="resources">
                  <span>
                    <Icon name="points" />
                    {p.points} points
                  </span>
                  <button
                    className="supplyButton"
                    aria-label={`${p.name} Inkling supply`}
                    onClick={() => {
                      const a = actions.find((a) => a.key === 'place');
                      if (i === actor && a) dispatch(a);
                      else setContextMenu({ title: 'Inkling supply', choices: [] });
                    }}
                  >
                    <Icon name="inkling" /> {p.supply} supply
                  </button>
                  <span>
                    II: {p.reserves[1]} · III: {p.reserves[2]}
                  </span>
                  <span>{p.handCount} Twists</span>
                </div>
                <div className="rows">
                  {ROWS.map((row) => (
                    <button
                      className="memoryTrack"
                      key={row}
                      title={String(content.tracks[ROWS.indexOf(row)][4])}
                      aria-label={`${rowName(row)} ${p.rows[row]}/3`}
                      onClick={() => {
                        if (i === actor)
                          setContextMenu({
                            title: `${rowName(row)} memory`,
                            choices: actions.filter(
                              (a) =>
                                (a.key.startsWith('upgrade:') || a.key.startsWith('memoryHere:')) &&
                                a.key.endsWith(':' + row),
                            ),
                          });
                      }}
                    >
                      <span className="trackHeading">
                        <Icon name={row} />
                        {rowName(row)} · level {p.rows[row]}
                      </span>
                      <span className="trackLevels">
                        {[0, 1, 2, 3].map((level) => (
                          <span
                            key={level}
                            className={`trackLevel ${level === p.rows[row] ? 'activeLevel' : ''} ${level > p.rows[row] ? 'coveredLevel' : 'revealedLevel'}`}
                            aria-label={`Level ${level}: ${level === 0 ? content.tracks[ROWS.indexOf(row)][2] : (content.tracks[ROWS.indexOf(row)][3] as string[])[level - 1]}${level === p.rows[row] ? ', current' : ''}`}
                          >
                            <span className="trackHex">
                              {level > p.rows[row] ? (
                                <Icon name={row} size={20} />
                              ) : level === p.rows[row] ? (
                                '✓'
                              ) : (
                                level
                              )}
                            </span>
                            <span>
                              {level === 0
                                ? String(content.tracks[ROWS.indexOf(row)][2])
                                : (content.tracks[ROWS.indexOf(row)][3] as string[])[level - 1]}
                            </span>
                          </span>
                        ))}
                      </span>
                      <small className="trackMemory">
                        Memory: {String(content.tracks[ROWS.indexOf(row)][4])}
                      </small>
                    </button>
                  ))}
                </div>
                <p className="muted">
                  Move {p.rows.curiosity + 1} · Power {p.rows.valor} · Hand limit{' '}
                  {3 + p.rows.insight} · Place {p.rows.resolve >= 2 ? p.rows.resolve : 1}
                  {p.rows.resolve === 1 ? ' (or discard to place 2)' : ''}
                </p>
                {p.subplot !== null && (
                  <details className="playerSubplot" open>
                    <summary>
                      Subplot: {subplots[p.subplot].name} · {p.progress}/
                      {subplots[p.subplot].target}
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
          ) : state!.players[actor!].controller === 'bot' ? (
            <section className="botStatus" role="status">
              {publicData!.players[actor!].name} {botsPaused ? 'is paused.' : 'is thinking…'}
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
            <TableMap
              data={publicData!}
              view={view && viewer === actor ? view : null}
              onAction={dispatch}
            />
            <aside className="actionPanel">
              <section>
                <h2>Available conflict tokens</h2>
                <div className="tokenPool">
                  {state!.pools[state!.act - 1].map((id) => (
                    <button
                      key={id}
                      className="poolToken"
                      onClick={() => {
                        const a = actions.find((a) => a.key === `token:${id}`);
                        setContextMenu({ title: tokens[id].name, choices: a ? [a] : [] });
                      }}
                    >
                      <b>{tokens[id].name}</b>
                      <p>{tokens[id].text}</p>
                      <small>
                        Act {tokens[id].act} · ×{tokens[id].act}
                      </small>
                    </button>
                  ))}
                </div>
              </section>
              {publicData!.battle && (
                <section className="battle">
                  <h2>Conflict power</h2>
                  {publicData!.battle.spaceOwner !== null && publicData!.battle.winner === null && (
                    <p className="scanStatus">
                      Checking space {publicData!.battle.space + 1} ·{' '}
                      {publicData!.players[publicData!.battle.spaceOwner!].name}
                    </p>
                  )}
                  {publicData!.battle.participants.map((p) => (
                    <p key={p}>
                      <b>{publicData!.players[p].name}</b> {publicData!.battle!.powers[p]}
                    </p>
                  ))}
                </section>
              )}
              {view && !state!.over && (
                <section className="choices" aria-live="polite">
                  <div className="eyebrow">{publicData!.players[viewer!].name}'s choice</div>
                  <h2>
                    {viewer === actor
                      ? (prompts[view.prompt] ?? 'Resolve the next effect.')
                      : 'Waiting for the other player.'}
                  </h2>
                  <div className="quickChoices">
                    {actions
                      .filter((a) =>
                        [
                          'skip',
                          'pass',
                          'finish',
                          'endMove',
                          'collect',
                          'foreshadow',
                          'character',
                          'alternative',
                        ].includes(a.key),
                      )
                      .map((a) => (
                        <button key={a.key} onClick={() => dispatch(a)}>
                          {a.label}
                        </button>
                      ))}
                  </div>
                  <details className="fallbackActions">
                    <summary>All legal actions</summary>
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
                  </details>
                </section>
              )}
              {view && (
                <section className="hand">
                  <h2>Your Twists</h2>
                  {view.hand.length === 0 && <p>No Twists in hand.</p>}
                  {view.hand.map((id) => (
                    <button
                      key={id}
                      className="handCard"
                      onClick={() =>
                        setContextMenu({
                          title: twists[id].name,
                          choices: actions.filter((a) =>
                            ['twist:', 'discard:', 'boost:', 'cycle:'].some(
                              (prefix) => a.key === prefix + id,
                            ),
                          ),
                        })
                      }
                    >
                      <span className="eyebrow">{twists[id].timing}</span>
                      <h3>{twists[id].name}</h3>
                      <p>{twists[id].text}</p>
                    </button>
                  ))}
                  {view.horse !== null && (
                    <article className="handCard">
                      <h3>Hidden Horse power</h3>
                      <p>
                        {content.horse[view.horse][0]} ·{' '}
                        {publicData!.players[viewer!].horseSpent ? 'spent this Act' : 'ready'}
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
                    <button
                      key={i}
                      className="characterActivation"
                      onClick={() => {
                        const a = actions.find((a) => a.key === `activate:${c.id}:${i}`);
                        setContextMenu({ title: characters[c.id].name, choices: a ? [a] : [] });
                      }}
                    >
                      <b>
                        {c.used[i]}/{max} occupied
                      </b>{' '}
                      · {t}
                    </button>
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
      {contextMenu && (
        <div className="contextBackdrop" onClick={() => setContextMenu(null)}>
          <section
            className="pieceDialog"
            role="dialog"
            aria-label={contextMenu.title}
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button aria-label="Close menu" onClick={() => setContextMenu(null)}>
              ×
            </button>
            <h2>{contextMenu.title}</h2>
            {contextMenu.choices.map((a) => (
              <button key={a.key} onClick={() => dispatch(a)}>
                <b>{a.label}</b>
                <small>{a.detail}</small>
              </button>
            ))}
            {!contextMenu.choices.length && <p>No action available here right now.</p>}
          </section>
        </div>
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
        Shared design workspace · Space-check edition 0.3 · local hotseat privacy protects the
        screen, not the device’s stored data.
      </footer>
    </>
  );
}
