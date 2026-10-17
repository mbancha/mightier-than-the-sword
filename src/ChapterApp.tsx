import { useEffect, useState, useRef } from 'react';
import source from './data/content.json';
import { chooseChapterAction } from './game/chapterBot';
import {
  newGame,
  applyAction,
  actingPlayer,
  playerView,
  content,
  bookmarkNames,
  bookmarkText,
  capacity,
  minimum,
  type State,
} from './game/chapters';
import './chapters.css';
import { settleFlow, flowView, applyFlow } from './game/chapterFlow';
import TabletopBook, { Meeple, Glyph } from './TabletopBook';
import './tabletop.css';
export default function ChapterApp() {
  const [game, setGame] = useState<State | null>(null),
    [history, setHistory] = useState<State[]>([]),
    [seats, setSeats] = useState(2),
    [seed, setSeed] = useState('42'),
    [bots, setBots] = useState<boolean[]>([false, true, false, false]),
    [revealed, setRevealed] = useState<number | null>(null),
    [error, setError] = useState(''),
    [auto, setAuto] = useState(true);
  const [selected, setSelected] = useState<number | null>(null),
    [zoom, setZoom] = useState(0.85);
  const table = useRef<HTMLDivElement>(null),
    pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const actor = game ? actingPlayer(game) : 0;
  const view = game ? flowView(game, actor) : null;
  const showHand =
    !!game &&
    !game.players[actor].bot &&
    (game.players.filter((p) => !p.bot).length === 1 || revealed === actor);
  const act = (key: string) => {
    if (!game) return;
    try {
      const next = game.players[actor].bot
        ? settleFlow(applyAction(game, key))
        : applyFlow(game, key);
      if (!game.players[actor].bot) setHistory((h) => [...h, game]);
      setGame(next);
      setSelected(null);
      setError('');
    } catch (e) {
      setError(String(e));
    }
  };
  useEffect(() => {
    if (!game || !auto || !game.players[actor].bot || game.winner !== null) return;
    const actions = playerView(game, actor).actions;
    if (!actions.length) return;
    const t = setTimeout(() => {
      const key = chooseChapterAction(playerView(game, actor));
      if (key) act(key);
    }, 250);
    return () => clearTimeout(t);
  }, [game, auto, actor]);
  const save = () => {
    if (game) localStorage.setItem('mtts-chapters-1', JSON.stringify({ game, history }));
  };
  const load = (text: string) => {
    try {
      const data = JSON.parse(text);
      if (data.game?.edition !== 'chapters-1')
        throw Error('This save belongs to another rules edition.');
      playerView(data.game, actingPlayer(data.game));
      setGame(settleFlow(data.game));
      setHistory(data.history ?? []);
      setRevealed(null);
      setAuto(true);
    } catch (e) {
      setError(`Cannot load: ${e}`);
    }
  };
  const download = () => {
    if (!game) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ game, history })], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mtts-private-chapters-save.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <main className="chapterApp">
      <header>
        <h1>Mightier than the Sword</h1>
        <p>Characters, ink, and the books worth fighting for.</p>
        <span>Digital playtest · Chapters edition</span>
      </header>
      {error && <p role="alert">{error}</p>}
      {!game ? (
        <section>
          <h2>Begin a story</h2>
          <label>
            Players{' '}
            <select value={seats} onChange={(e) => setSeats(Number(e.target.value))}>
              {[2, 3, 4].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Shuffle seed <input value={seed} onChange={(e) => setSeed(e.target.value)} />
          </label>
          {Array.from({ length: seats }, (_, i) => (
            <label key={i}>
              Player {i + 1} controller{' '}
              <select
                aria-label={`Player ${i + 1} controller`}
                value={bots[i] ? 'bot' : 'human'}
                onChange={(e) =>
                  setBots((a) => a.map((v, k) => (k === i ? e.target.value === 'bot' : v)))
                }
              >
                <option value="human">Human</option>
                <option value="bot">Bot</option>
              </select>
            </label>
          ))}
          <button
            onClick={() => {
              setGame(
                settleFlow(
                  newGame(
                    Array.from({ length: seats }, (_, i) => `Player ${i + 1}`),
                    Number(seed) || 1,
                    bots,
                  ),
                ),
              );
              setHistory([]);
              setAuto(true);
              setRevealed(null);
            }}
          >
            Begin story
          </button>
          <button onClick={() => load(localStorage.getItem('mtts-chapters-1') ?? '{}')}>
            Load local story
          </button>
        </section>
      ) : (
        view && (
          <>
            <nav aria-label="Story controls">
              <button
                disabled={!history.length}
                onClick={() => {
                  setGame(history.at(-1)!);
                  setHistory((h) => h.slice(0, -1));
                  setAuto(false);
                  setRevealed(null);
                }}
              >
                Undo
              </button>
              <button onClick={save}>Save locally</button>
              <button onClick={download}>Download private save</button>
              <label>
                Load private save{' '}
                <input
                  type="file"
                  accept="application/json"
                  onChange={(e) => {
                    e.target.files?.[0]?.text().then(load);
                  }}
                />
              </label>
              <button onClick={() => setAuto((x) => !x)}>{auto ? 'Pause bots' : 'Run bots'}</button>
              <button
                onClick={() => {
                  setGame(null);
                  setAuto(false);
                }}
              >
                New story
              </button>
            </nav>
            {view.winner !== null ? (
              <h2 role="status">
                {view.players[view.winner].name} wins with {view.players[view.winner].books.length}{' '}
                books!
              </h2>
            ) : (
              <h2>
                {view.players[actor].name} ·{' '}
                {(
                  {
                    setup: 'Choose a starting page',
                    start: 'Begin your turn',
                    movement: 'Move your characters',
                    route: 'Place an Inkling, or pay ink to move farther',
                    place: 'Place an Inkling',
                    afterPlace: 'Additional placement',
                    bonus: 'Page bonus',
                    subplot: 'Complete a Subplot',
                    twist: 'Play a Twist or pass',
                    publish: 'Publish a book',
                    evacuate: 'Leave the claimed book',
                    compact: 'Close the gap',
                    character: 'Meet your companion',
                    transfer: 'Move your Inklings',
                    exchange: 'Exchange a card',
                    castle: 'Castle Dracula',
                    hyde: 'Become Hyde',
                    laboratory: 'The laboratory',
                    aeneas: 'Carry them home',
                    express: 'Express connection',
                  } as Record<string, string>
                )[view.phase ?? ''] ?? 'Resolve an effect'}{' '}
                · Turn {view.turn}
              </h2>
            )}
            <div className="chapterPlayers">
              {view.players.map((p, i) => (
                <section className={`seat seat${i}`} key={i}>
                  <h3>
                    {p.name} {i === actor ? '• choosing' : ''}
                  </h3>
                  <label>
                    <Glyph kind="ink" /> {p.ink} / {capacity(p)}{' '}
                    <meter min={0} max={capacity(p)} value={p.ink} />
                  </label>
                  <p>
                    Chapter {p.chapter} · {p.supply} Inklings available · Minimum hand {minimum(p)}{' '}
                    · {p.handCount} cards
                  </p>
                  {p.figures.map((f) => (
                    <details key={f.id}>
                      <summary>
                        {f.primary ? '★ Protagonist: ' : 'Companion: '}
                        {content.characters[f.id].name} · {content.characters[f.id].power} base
                        power
                      </summary>
                      {content.characters[f.id].ability}
                    </details>
                  ))}
                  <p>
                    <Glyph kind="book" /> {p.books.length} / {view.players.length === 2 ? 3 : 2}
                  </p>
                  {p.books.map((id) => (
                    <span className="collected" key={id}>
                      {source.books[id].title}
                    </span>
                  ))}
                  {p.marks.map((m, k) => (
                    <details className="bookmark earned" key={k}>
                      <summary>{bookmarkNames[m]}</summary>
                      {bookmarkText[m]}
                    </details>
                  ))}
                  {p.ongoing.map((n) => (
                    <details key={n}>
                      <summary>{content.subplots[n].name}</summary>
                      {content.subplots[n].ongoing}
                    </details>
                  ))}
                </section>
              ))}
            </div>
            <section>
              <h2>The library</h2>
              <p>
                {view.stackCount} books remain in the stack. First conflict awards the bookmark;
                second conflict claims the book.
              </p>
              <div className="tableTools">
                <button
                  onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
                  aria-label="Zoom out"
                >
                  −
                </button>
                <button onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))} aria-label="Zoom in">
                  ＋
                </button>
                <button
                  onClick={() => {
                    const el = table.current;
                    if (el) {
                      const canvas = el.firstElementChild as HTMLElement;
                      setZoom(
                        Math.max(
                          0.3,
                          Math.min(
                            1,
                            (el.clientWidth - 40) / (canvas.offsetWidth || 1000),
                            (el.clientHeight - 40) / (canvas.offsetHeight || 700),
                          ),
                        ),
                      );
                      el.scrollTo(0, 0);
                    }
                  }}
                >
                  Fit table
                </button>
                <span>
                  Drag the table to pan · Tap a character, then a highlighted page or space
                </span>
              </div>
              <div
                className="visualTable"
                ref={table}
                onPointerDown={(e) => {
                  if (
                    (e.target as HTMLElement).closest('button,summary,details') ||
                    e.pointerType === 'touch'
                  )
                    return;
                  const el = table.current!;
                  pan.current = {
                    x: e.clientX,
                    y: e.clientY,
                    left: el.scrollLeft,
                    top: el.scrollTop,
                  };
                  el.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (pan.current && table.current) {
                    table.current.scrollLeft = pan.current.left - (e.clientX - pan.current.x);
                    table.current.scrollTop = pan.current.top - (e.clientY - pan.current.y);
                  }
                }}
                onPointerUp={() => (pan.current = null)}
                onPointerCancel={() => (pan.current = null)}
              >
                <div
                  className="tableCanvas"
                  style={{
                    zoom,
                    gridTemplateColumns: `repeat(${Math.max(...view.books.map((b) => 2 * b.q + b.r)) - Math.min(...view.books.map((b) => 2 * b.q + b.r)) + 2},240px)`,
                  }}
                >
                  {view.books.map((b) => (
                    <div
                      className="bookPosition"
                      key={b.id}
                      style={{
                        gridColumn: `${2 * b.q + b.r - Math.min(...view.books.map((x) => 2 * x.q + x.r)) + 1} / span 2`,
                        gridRow: b.r - Math.min(...view.books.map((x) => x.r)) + 1,
                      }}
                    >
                      <TabletopBook
                        b={b}
                        view={view}
                        selected={
                          selected !== null &&
                          view.players[actor].figures.some((f) => f.id === selected)
                            ? selected
                            : null
                        }
                        onSelect={setSelected}
                        sourcePage={
                          view.players[actor].figures.find((f) => f.id === game.source)?.page
                        }
                        act={act}
                        enabled={showHand}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
            {view.winner === null && (
              <section className="choices">
                <h2>Choose an action</h2>
                {game.players[actor].bot ? (
                  <p role="status">{view.players[actor].name} is thinking…</p>
                ) : !showHand ? (
                  <button onClick={() => setRevealed(actor)}>
                    Pass to {view.players[actor].name}
                  </button>
                ) : (
                  <>
                    <div className="hand">
                      {view.players[actor].hand.map((c) => (
                        <details key={c.id}>
                          <summary>
                            {c.kind === 'twist' ? 'Twist' : 'Subplot'}:{' '}
                            {c.kind === 'twist'
                              ? content.twists[c.design].name
                              : content.subplots[c.design].name}
                          </summary>
                          {c.kind === 'twist' ? (
                            <p>
                              {content.twists[c.design].cost} ink ·{' '}
                              {content.twists[c.design].effect}
                            </p>
                          ) : (
                            <>
                              <p>{content.subplots[c.design].condition}</p>
                              <p>Ongoing: {content.subplots[c.design].ongoing}</p>
                              <p>Immediate: {content.subplots[c.design].instant}</p>
                              <p>Or play for 1 ink and +1 power.</p>
                            </>
                          )}
                        </details>
                      ))}
                    </div>
                    <div className="chapterActions">
                      {view.actions
                        .filter((a) => !/^(move|step|setup|place):/.test(a.key))
                        .map((a) => (
                          <button key={a.key} onClick={() => act(a.key)}>
                            {a.label}
                          </button>
                        ))}
                    </div>
                    <details className="advancedActions">
                      <summary>All actions</summary>
                      <div className="chapterActions">
                        {view.actions.map((a) => (
                          <button key={a.key} onClick={() => act(a.key)}>
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </details>
                    {!view.actions.length && (
                      <p role="alert">No legal choices. Save this story for diagnosis.</p>
                    )}
                  </>
                )}
              </section>
            )}
            <details>
              <summary>Story log</summary>
              {view.log.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </details>
          </>
        )
      )}
    </main>
  );
}
