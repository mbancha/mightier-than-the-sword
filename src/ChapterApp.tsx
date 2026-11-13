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
  edition,
  cardCost,
  subplotPower,
  minimum,
  type State,
} from './game/chapters';
import './chapters.css';
import { settleFlow, flowView, applyFlow } from './game/chapterFlow';
import TabletopBook, { Meeple, Glyph } from './TabletopBook';
import './tabletop.css';
import GameCard, { RulesText } from './GameCard';
import './cards.css';
import EdgePanel from './EdgePanel';
import './edge-panels.css';
export default function ChapterApp() {
  const [game, setGame] = useState<State | null>(null),
    [history, setHistory] = useState<State[]>([]),
    [seats, setSeats] = useState(2),
    [seed, setSeed] = useState('42'),
    [bots, setBots] = useState<boolean[]>([false, true, false, false, false]),
    [revealed, setRevealed] = useState<number | null>(null),
    [error, setError] = useState(''),
    [auto, setAuto] = useState(true);
  const [selected, setSelected] = useState<number | null>(null),
    [zoom, setZoom] = useState<number | null>(null),
    [fitZoom, setFitZoom] = useState(1);
  const table = useRef<HTMLDivElement>(null),
    pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = table.current, grid = canvas.current;
    if (!viewport || !grid) return;
    const fit = () => {
      setFitZoom(Math.min(
        (viewport.clientWidth - 32) / Math.max(1, grid.offsetWidth),
        (viewport.clientHeight - 24) / Math.max(1, grid.offsetHeight),
      ));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    observer.observe(grid);
    fit();
    return () => observer.disconnect();
  }, [!!game]);
  const actor = game ? actingPlayer(game) : 0;
  const view = game ? flowView(game, actor) : null;
  const sites = (view?.actions ?? [])
    .filter((a) => a.key.startsWith('publish:'))
    .map((a) => {
      const [, q, r] = a.key.split(':');
      return { q: Number(q), r: Number(r), action: a };
    });
  const positions = [...(view?.books ?? []), ...sites];
  const minX = Math.min(...positions.map((b) => 2 * b.q + b.r));
  const minR = Math.min(...positions.map((b) => b.r));
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
      if (actingPlayer(next) !== actor) setRevealed(null);
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
    if (game) localStorage.setItem(edition, JSON.stringify({ game, history }));
  };
  const load = (text: string) => {
    try {
      const data = JSON.parse(text);
      if (data.game?.edition !== edition)
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
    <main className={`chapterApp${game ? ' tableMode' : ''}`}>
      {!game && <header>
        <h1>Mightier than the Sword</h1>
        <p>Characters, ink, and the books worth fighting for.</p>
        <span>Digital playtest · Chapters edition</span>
      </header>}
      {error && <p role="alert">{error}</p>}
      {!game ? (
        <section>
          <h2>Begin a story</h2>
          <label>
            Players{' '}
            <select value={seats} onChange={(e) => setSeats(Number(e.target.value))}>
              {[2, 3, 4, 5].map((n) => (
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
              setZoom(null);
              setAuto(true);
              setRevealed(null);
            }}
          >
            Begin story
          </button>
          <button onClick={() => load(localStorage.getItem(edition) ?? '{}')}>
            Load local story
          </button>
        </section>
      ) : (
        view && (
          <>
            <EdgePanel edge="top" label="Story">
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
            <div className="tableTools">
              <button aria-label="Zoom out" onClick={() => setZoom(Math.max(0.1, (zoom ?? fitZoom) - 0.1))}>−</button>
              <button aria-label="Zoom in" onClick={() => setZoom((zoom ?? fitZoom) + 0.1)}>＋</button>
              <button onClick={() => { setZoom(null); table.current?.scrollTo(0, 0); }}>Fit table</button>
            </div>
            <p>{view.stackCount} books in the library.</p>
            {view.nextBookmark !== null && <p>Next bookmark · {bookmarkNames[view.nextBookmark]} · {bookmarkText[view.nextBookmark]}</p>}
            <details><summary>Base rules</summary>{content.baseRules.map((rule) => <p key={rule}>{rule}</p>)}</details>
            <details><summary>Story log</summary>{view.log.map((line, i) => <p key={i}>{line}</p>)}</details>
            </EdgePanel>
            <div className="turnStrip">
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
            {view.nextBookmark !== null && <span title={bookmarkText[view.nextBookmark]}>Next · {bookmarkNames[view.nextBookmark]}</span>}
            </div>
            {(['left', 'right'] as const).map((edge) => (
            <EdgePanel key={edge} edge={edge} label={edge === 'left' ? 'Your tableau' : 'Other players'}>
            <div className="chapterPlayers">
              {view.players.map((p, i) => ({p, i})).filter(({i}) => (edge === 'left') === (i === (game.players.filter((player) => !player.bot).length === 1 ? game.players.findIndex((player) => !player.bot) : actor))).map(({p, i}) => (
                <section className={`seat seat${i}`} key={i}>
                  <h3>
                    {p.name} {i === actor ? '• choosing' : ''}
                  </h3>
                  <label>
                    <Glyph kind="ink" /> {p.ink} / {capacity(p)}{' '}
                    <meter min={0} max={capacity(p)} value={p.ink} />
                  </label>
                  <small>
                    Chapter {p.chapter} · Minimum hand {minimum(p)}
                  </small>
                  <div
                    className="playerReserve"
                    aria-label={`${p.name}: ${p.supply} Inklings available`}
                  >
                    <span>Available · {p.supply}</span>
                    <div>
                      {Array.from({ length: p.supply }, (_, n) => (
                        <Meeple key={n} owner={i} small />
                      ))}
                    </div>
                  </div>
                  <div className="handCount" aria-label={`${p.name}: ${p.handCount} cards in hand`}>
                    <div className="cardBacks">
                      {Array.from({ length: Math.min(p.handCount, 12) }, (_, n) => (
                        <span className="cardBack" key={n}>
                          <Glyph kind="book" />
                        </span>
                      ))}
                    </div>
                    <span>{p.handCount} cards</span>
                  </div>
                  <div className="characterCards">
                    {p.figures.map((f) => (
                      <div key={f.id}>
                        <small>{f.primary ? '★ Protagonist' : 'Companion'}</small>
                        <GameCard kind="character" design={f.id} />
                      </div>
                    ))}
                  </div>
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
                      <RulesText text={bookmarkText[m]} />
                    </details>
                  ))}
                  {p.ongoing.map((n) => (
                    <details key={n}>
                      <summary>{content.subplots[n].name}</summary>
                      <RulesText text={content.subplots[n].ongoing} />
                    </details>
                  ))}
                </section>
              ))}
            </div>
            </EdgePanel>
            ))}
            <section className="boardSection" aria-label="Book table">
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
                  ref={canvas}
                  style={{
                    zoom: zoom ?? fitZoom,
                    gridTemplateColumns: `repeat(${Math.max(...positions.map((b) => 2 * b.q + b.r)) - minX + 2},240px)`,
                  }}
                >
                  {showHand &&
                    sites.map((site) => (
                      <button
                        className="publishSite"
                        key={site.action.key}
                        style={{
                          gridColumn: `${2 * site.q + site.r - minX + 1} / span 2`,
                          gridRow: site.r - minR + 1,
                        }}
                        aria-label={site.action.label}
                        onClick={() => act(site.action.key)}
                      >
                        <Glyph kind="book" />
                        <span>Place new book here</span>
                      </button>
                    ))}
                  {view.books.map((b) => (
                    <div
                      className="bookPosition"
                      key={b.id}
                      style={{
                        gridColumn: `${2 * b.q + b.r - minX + 1} / span 2`,
                        gridRow: b.r - minR + 1,
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
            {view.battle && view.publicPlays.length > 0 && (
              <div className="publicPlays" role="status">
                Played · {view.publicPlays.map((card) => (card.kind === 'twist' ? content.twists : content.subplots)[card.design].name).join(' · ')}
              </div>
            )}
            {view.winner === null && (
              <section className="choices">
                {game.players[actor].bot ? (
                  <p role="status">{view.players[actor].name} is thinking…</p>
                ) : !showHand ? (
                  <button onClick={() => setRevealed(actor)}>
                    Pass to {view.players[actor].name}
                  </button>
                ) : (
                  <>
                    <EdgePanel edge="bottom" label={`Hand (${view.players[actor].handCount})`}>
                    <div className="hand">
                      {view.players[actor].hand.map((c) => (
                        <GameCard
                          key={c.id}
                          kind={c.kind}
                          design={c.design}
                          cost={cardCost(view.players[actor], c)}
                          boost={c.kind === 'subplot' ? subplotPower(view.players[actor], c.design) : undefined}
                          actions={view.actions
                            .filter(
                              (a) =>
                                a.key === `card:${c.id}` || a.key.startsWith(`subplot:${c.id}:`) || a.key === `discard:${c.id}` || a.key === `exchange:${c.id}`,
                            )
                            .map((a) => ({
                              key: a.key,
                              label: a.key.split(':').length > 3 ? a.label : a.key.startsWith('subplot:')
                                ? a.key.endsWith('true')
                                  ? 'Keep bonus'
                                  : 'Take reward'
                                : /^(discard|exchange):/.test(a.key) ? 'Discard' : 'Play',
                              run: () => act(a.key),
                            }))}
                        />
                      ))}
                    </div>
                    </EdgePanel>
                    <div className="chapterActions">
                      {view.actions
                        .filter(
                          (a) => !/^(move|step|setup|place|card|subplot|publish|discard|exchange):/.test(a.key),
                        )
                        .map((a) => (
                          <button key={a.key} onClick={() => act(a.key)}>
                            <RulesText text={a.label} />
                          </button>
                        ))}
                    </div>
                    <details className="advancedActions">
                      <summary>All actions</summary>
                      <div className="chapterActions">
                        {view.actions.map((a) => (
                          <button key={a.key} onClick={() => act(a.key)}>
                            <RulesText text={a.label} />
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
          </>
        )
      )}
    </main>
  );
}
