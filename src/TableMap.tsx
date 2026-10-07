import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { books, characters, content, rowName, tokens } from './data/catalog';
import type { Choice } from './game/types';
import type { publicView, playerView } from './game/views';
import { adjacentBooks } from './game/topology';

type Public = ReturnType<typeof publicView>;
type Private = ReturnType<typeof playerView>;
const colors = content.players.map((p) => p.color);
const W = 360,
  H = 420,
  DX = 380,
  DY = 440;
const xy = (q: number, r: number) => ({ x: (q + r / 2) * DX, y: r * DY });
const icon = (name: string, size = 22) => (
  <img
    draggable={false}
    className="icon"
    src={`./icons/${name}.svg`}
    alt=""
    width={size}
    height={size}
  />
);
export function TableMap({
  data,
  view,
  onAction,
}: {
  data: Public;
  view: Private | null;
  onAction: (a: Choice) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState({ x: 20, y: 20, z: 0.7 });
  const [moving, setMoving] = useState(false);
  const [menu, setMenu] = useState<{
    title: string;
    choices: Choice[];
    x: number;
    y: number;
  } | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number; label: string } | null>(null);
  const gesture = useRef<{
    kind: 'piece' | 'pan';
    x: number;
    y: number;
    cx: number;
    cy: number;
    moved: boolean;
    label?: string;
  } | null>(null);
  const suppressClick = useRef(false);
  const actions = view?.actions ?? [];
  const moveActions = actions.filter((a) =>
    a.key.startsWith(
      view?.moving?.remaining === null || view?.prompt === 'setup' ? 'page:' : 'step:',
    ),
  );
  const fit = () => {
    const el = viewport.current;
    if (!el) return;
    const pts = [
      ...data.books.map((b) => xy(b.q, b.r)),
      ...actions.filter((a) => a.key.startsWith('publish:')).map((a) => xy(a.q!, a.r!)),
    ];
    const minX = Math.min(...pts.map((p) => p.x)),
      minY = Math.min(...pts.map((p) => p.y));
    const width = Math.max(...pts.map((p) => p.x)) + W - minX,
      height = Math.max(...pts.map((p) => p.y)) + H - minY;
    const z = Math.min(1, (el.clientWidth - 70) / width, (el.clientHeight - 70) / height);
    setCamera({
      z,
      x: (el.clientWidth - width * z) / 2 - minX * z,
      y: (el.clientHeight - height * z) / 2 - minY * z,
    });
  };
  useEffect(() => {
    fit();
    const observer = new ResizeObserver(fit);
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [data.books.length, view?.prompt === 'publish']);
  useEffect(() => {
    setMenu(null);
    setMoving(false);
    setDrag(null);
    gesture.current = null;
  }, [data.turn, data.actor, view?.prompt]);
  const zoom = (factor: number, px?: number, py?: number) =>
    setCamera((c) => {
      const x = px ?? viewport.current!.clientWidth / 2,
        y = py ?? viewport.current!.clientHeight / 2;
      const z = Math.max(0.2, Math.min(1.8, c.z * factor));
      return { z, x: x - ((x - c.x) * z) / c.z, y: y - ((y - c.y) * z) / c.z };
    });
  useEffect(() => {
    const el = viewport.current!;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoom(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);
  function choose(a: Choice) {
    setMenu(null);
    onAction(a);
  }
  function popup(e: React.MouseEvent, title: string, choices: Choice[]) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    const r = viewport.current!.getBoundingClientRect();
    setMenu({
      title,
      choices,
      x: Math.max(8, Math.min(e.clientX - r.left, r.width - 290)),
      y: Math.max(8, Math.min(e.clientY - r.top, r.height - 240)),
    });
  }
  function pieceDown(e: ReactPointerEvent, allowed: boolean, label: string) {
    if (!allowed || e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setMoving(true);
    setMenu(null);
    gesture.current = {
      kind: 'piece',
      x: e.clientX,
      y: e.clientY,
      cx: camera.x,
      cy: camera.y,
      moved: false,
      label,
    };
  }
  function finishGesture(e: ReactPointerEvent) {
    const g = gesture.current;
    gesture.current = null;
    setDrag(null);
    if (!g) return;
    suppressClick.current = g.moved;
    setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    if (g.kind === 'piece' && g.moved) {
      const target = document
        .elementsFromPoint(e.clientX, e.clientY)
        .map((el) => el.closest('[data-page]'))
        .find(Boolean);
      const page = Number(target?.getAttribute('data-page'));
      const a = target ? moveActions.find((a) => a.page === page) : undefined;
      if (a) {
        choose(a);
        setMoving(true);
      } // Invalid drops do not spend movement.
    }
  }
  const pageChoice = (page: number) =>
    actions.filter(
      (a) => a.page === page && !a.key.startsWith('page:') && !a.key.startsWith('step:'),
    );
  const figureMenu = (
    e: React.MouseEvent,
    label: string,
    isMoving: boolean,
    own: boolean,
    cid?: number,
  ) => {
    if (isMoving) setMoving(true);
    const opts = isMoving
      ? actions.filter((a) => a.key === 'endMove')
      : own
        ? actions.filter((a) =>
            cid === undefined
              ? ['place', 'upgrade', 'finish', 'bookMove:Quill'].includes(a.key)
              : a.key.startsWith(`activate:${cid}:`) || a.key === `bookMove:${cid}`,
          )
        : [];
    popup(e, label, [...opts, ...actions.filter((a) => a.key === `ignore:${cid}`)]);
  };
  return (
    <section className="mapShell" aria-label="Growing book map">
      <div className="mapControls">
        <div>
          <b>The story atlas</b>
          <small>
            {data.books.length} books · {data.unpublishedCount} unpublished · drag empty felt to pan
          </small>
        </div>
        <button aria-label="Zoom out" onClick={() => zoom(0.8)}>
          −
        </button>
        <output aria-label="Map zoom">{Math.round(camera.z * 100)}%</output>
        <button aria-label="Zoom in" onClick={() => zoom(1.25)}>
          +
        </button>
        <button onClick={fit}>Fit map</button>
      </div>
      <div
        className="mapViewport"
        ref={viewport}
        tabIndex={0}
        aria-label="Book map. Drag background to pan. Use zoom controls."
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          const d: { [k: string]: number[] } = {
            ArrowLeft: [50, 0],
            ArrowRight: [-50, 0],
            ArrowUp: [0, 50],
            ArrowDown: [0, -50],
          };
          if (d[e.key]) {
            e.preventDefault();
            setCamera((c) => ({ ...c, x: c.x + d[e.key][0], y: c.y + d[e.key][1] }));
          }
          if (e.key === 'Escape') {
            setMenu(null);
            setMoving(false);
          }
        }}
        onPointerDown={(e) => {
          if (e.button !== 0 || (e.target as HTMLElement).closest('button,article,.mapPopup'))
            return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setMenu(null);
          gesture.current = {
            kind: 'pan',
            x: e.clientX,
            y: e.clientY,
            cx: camera.x,
            cy: camera.y,
            moved: false,
          };
        }}
        onPointerMove={(e) => {
          const g = gesture.current;
          if (!g) return;
          if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 4) g.moved = true;
          if (g.kind === 'pan')
            setCamera((c) => ({ ...c, x: g.cx + e.clientX - g.x, y: g.cy + e.clientY - g.y }));
          else if (g.moved) {
            const r = viewport.current!.getBoundingClientRect();
            setDrag({ x: e.clientX - r.left, y: e.clientY - r.top, label: g.label! });
          }
        }}
        onPointerUp={finishGesture}
        onPointerCancel={() => {
          gesture.current = null;
          setDrag(null);
        }}
      >
        <div
          className="mapCanvas"
          style={{ transform: `translate(${camera.x}px,${camera.y}px) scale(${camera.z})` }}
        >
          <svg className="mapConnections" aria-hidden="true">
            {data.books.flatMap((b, i) =>
              data.books
                .slice(i + 1)
                .map((c, j) =>
                  adjacentBooks(b, c) ? (
                    <line
                      key={`${i}-${j}`}
                      x1={xy(b.q, b.r).x + W / 2}
                      y1={xy(b.q, b.r).y + H / 2}
                      x2={xy(c.q, c.r).x + W / 2}
                      y2={xy(c.q, c.r).y + H / 2}
                    />
                  ) : null,
                ),
            )}
          </svg>
          {actions
            .filter((a) => a.key.startsWith('publish:'))
            .map((a) => (
              <button
                key={a.key}
                className="publishSite"
                data-testid="publish-site"
                style={{ left: xy(a.q!, a.r!).x, top: xy(a.q!, a.r!).y, width: W, height: H }}
                onClick={() => choose(a)}
              >
                <span>Publish here</span>
                <b>{data.publishing !== null ? books[data.publishing].title : ''}</b>
                <small>Touches at least two books</small>
              </button>
            ))}
          {data.books.map((b, bi) => {
            const def = books[b.id],
              pt = xy(b.q, b.r);
            return (
              <article
                className={`book mapBook ${data.battle?.book === bi ? 'fighting' : ''}`}
                key={bi}
                data-book={bi}
                data-genre={def.genre}
                style={{ left: pt.x, top: pt.y, width: W, height: H }}
              >
                <div className="bookTitle">
                  <div>
                    <span className="eyebrow">{def.genre}</span>
                    <h3>{def.title}</h3>
                    <em>{def.where}</em>
                  </div>
                  <button
                    className="vpSpace"
                    aria-label={`Conflict at ${def.title}`}
                    onClick={(e) =>
                      popup(
                        e,
                        def.title,
                        actions.filter(
                          (a) => a.key === `conflict:${bi}` || a.key === `forcedConflict:${bi}`,
                        ),
                      )
                    }
                  >
                    {icon('points')}
                    Conflict
                    <small>Token points</small>
                  </button>
                </div>
                <p className="bookEffect">
                  {icon(
                    def.timing.includes('CONFLICT')
                      ? 'conflict'
                      : def.timing.startsWith('ON ')
                        ? 'inkling'
                        : 'ongoing',
                    17,
                  )}{' '}
                  <b>{def.timing.toLowerCase()}</b> · {def.effect}
                </p>
                <div className="pages">
                  {[0, 1].map((side) => {
                    const page = bi * 2 + side,
                      legal = moveActions.find((a) => a.page === page),
                      lit = !!legal && (moving || view?.prompt === 'setup');
                    return (
                      <div key={side} data-page={page} className={`page ${lit ? 'legalPage' : ''}`}>
                        <button
                          className="pageLabel"
                          aria-label={`${def.title} ${side ? 'right' : 'left'} page`}
                          onClick={(e) => {
                            if (legal && (moving || view?.prompt === 'setup')) {
                              choose(legal);
                              setMoving(true);
                            } else
                              popup(
                                e,
                                `${def.title} · ${side ? 'right' : 'left'}`,
                                pageChoice(page),
                              );
                          }}
                        >
                          {side ? 'Right' : 'Left'} page {lit ? '· move here' : ''}
                        </button>
                        <div className="figures">
                          {data.players.map((p, i) => {
                            if (
                              p.page !== page &&
                              !(view?.prompt === 'setup' && i === data.actor && page === 0)
                            )
                              return null;
                            const isMoving =
                              !!view?.moving && view.moving.character === null && i === data.actor;
                            return (
                              <button
                                key={'p' + i}
                                className={`figure Quill ${isMoving ? 'movable' : ''}`}
                                style={
                                  {
                                    '--piece-color': colors[i],
                                    borderColor: colors[i],
                                  } as CSSProperties
                                }
                                aria-label={`${p.name} Quill`}
                                onPointerDown={(e) => pieceDown(e, isMoving, p.name)}
                                onClick={(e) =>
                                  figureMenu(
                                    e,
                                    isMoving
                                      ? `${p.name} · ${view?.moving?.remaining ?? 'any'} steps left`
                                      : p.name,
                                    isMoving,
                                    i === data.actor,
                                  )
                                }
                              >
                                {icon('Quill', 28)}
                                <span>{p.name}</span>
                              </button>
                            );
                          })}
                          {data.characters
                            .filter((c) => c.page === page || c.other === page)
                            .map((c) => {
                              const isMoving = !!view?.moving && view.moving.character === c.id;
                              return (
                                <button
                                  key={'c' + c.id}
                                  className={`figure ${isMoving ? 'movable' : ''}`}
                                  style={{ borderColor: colors[c.owner] }}
                                  aria-label={`${characters[c.id].name} figure`}
                                  onPointerDown={(e) =>
                                    pieceDown(e, isMoving, characters[c.id].name)
                                  }
                                  onClick={(e) =>
                                    figureMenu(
                                      e,
                                      characters[c.id].name,
                                      isMoving,
                                      c.owner === data.actor,
                                      c.id,
                                    )
                                  }
                                >
                                  {characters[c.id].name}
                                </button>
                              );
                            })}
                        </div>
                        <div className="slots">
                          {b.slots.map((spot, k) =>
                            spot.page === side ? (
                              <button
                                className={`slot ${data.battle?.book === bi && data.battle.space === k && data.battle.spaceOwner !== null && data.battle.winner === null ? 'scanSlot' : ''} ${actions.some((a) => (['place:' + k, 'placeHere:' + k].includes(a.key) || (a.key.startsWith('adjacent:') && a.key.endsWith(':place:' + k))) && a.book === bi) ? 'legalSlot' : ''}`}
                                key={k}
                                aria-label={`${def.title} space ${k + 1}${spot.owner !== null ? ' occupied by ' + data.players[spot.owner].name : ''}`}
                                onClick={(e) => {
                                  const choices = actions.filter(
                                    (a) =>
                                      ((['place:' + k, 'placeHere:' + k].includes(a.key) ||
                                        (a.key.startsWith('adjacent:') &&
                                          a.key.endsWith(':place:' + k))) &&
                                        a.book === bi) ||
                                      a.key.startsWith(`upgrade:${bi}:${k}:`) ||
                                      a.key.startsWith(`turn:upgrade:${bi}:${k}:`) ||
                                      (a.key === `memory:${k}` &&
                                        view?.prompt === 'returnMemory' &&
                                        a.book === bi) ||
                                      a.key.startsWith(`target:${bi}:${k}:`),
                                  );
                                  if (choices.length === 1) choose(choices[0]);
                                  else
                                    popup(
                                      e,
                                      `Page space ${k + 1}${spot.memory ? ' · ' + rowName(spot.memory.row) : ''}`,
                                      choices.length
                                        ? choices
                                        : spot.owner === data.actor
                                          ? actions.filter((a) => a.key === 'upgrade')
                                          : [],
                                    );
                                }}
                              >
                                <small>{k + 1}</small>
                                {b.id === 6 && k === 0 && (
                                  <span
                                    className="castleSlot"
                                    title="Castle: before conflict, this Inkling's owner may erase any 1 Inkling here"
                                  >
                                    {icon('castle', 18)}
                                  </span>
                                )}
                                {spot.memory && (
                                  <span
                                    className="memory"
                                    style={{ borderColor: colors[spot.memory.owner] }}
                                  >
                                    {icon(spot.memory.row)}
                                  </span>
                                )}
                                {(spot.owner !== null || spot.neutral) && (
                                  <span
                                    className="piece"
                                    style={{
                                      background: spot.neutral ? '#777' : colors[spot.owner!],
                                    }}
                                  >
                                    {spot.neutral ? 'N' : spot.owner! + 1}
                                  </span>
                                )}
                              </button>
                            ) : null,
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  className={`overflow ${actions.some((a) => a.key === `publishOverflow:${bi}`) ? 'legalSlot' : ''}`}
                  onClick={(e) => {
                    const opts = actions.filter(
                      (a) =>
                        ((['place:null', 'placeHere:null'].includes(a.key) ||
                          (a.key.startsWith('adjacent:') && a.key.endsWith(':place:null'))) &&
                          a.book === bi) ||
                        a.key === `publishOverflow:${bi}` ||
                        a.key.startsWith(`target:${bi}:null:`) ||
                        a.key === `bindingRedirect:${bi}`,
                    );
                    if (opts.length === 1) choose(opts[0]);
                    else popup(e, 'Binding spaces', opts);
                  }}
                >
                  <b>
                    {b.id === 0 ? 'Binding spaces · redirect to adjacent book' : 'Binding spaces'}
                  </b>
                  {b.overflow.map((n, p) =>
                    n ? (
                      <span key={p} style={{ color: colors[p] }}>
                        {data.players[p].name}: {n}
                      </span>
                    ) : null,
                  )}
                </button>
                <div className="bookTokens">
                  {b.tokens.map((t) => (
                    <button
                      key={t.id}
                      title={t.strong ? tokens[t.id].text : `${tokens[t.id].act} points`}
                      onClick={(e) =>
                        popup(
                          e,
                          tokens[t.id].name,
                          actions.filter((a) => a.key === `reward:${t.id}`),
                        )
                      }
                    >
                      Act {tokens[t.id].act} · {t.strong ? 'strong' : `${tokens[t.id].act} PP`}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        {menu && (
          <div
            role="dialog"
            aria-label={menu.title}
            className="mapPopup"
            style={{ left: menu.x, top: menu.y }}
          >
            <button
              className="popupClose"
              aria-label="Close piece menu"
              onClick={() => setMenu(null)}
            >
              ×
            </button>
            <b>{menu.title}</b>
            {menu.choices.map((a) => (
              <button key={a.key} onClick={() => choose(a)}>
                {a.label}
                <small>{a.detail}</small>
              </button>
            ))}
            {!menu.choices.length && (
              <p>
                {view?.moving
                  ? 'Drag this figure or click a highlighted page.'
                  : 'No action available for this piece now.'}
              </p>
            )}
          </div>
        )}
        {drag && (
          <div className="dragGhost" style={{ left: drag.x, top: drag.y }}>
            {icon('Quill', 30)}
            {drag.label}
          </div>
        )}
        <div className="mapHint">
          {view?.prompt === 'publish'
            ? 'Choose a dashed space for the next book.'
            : view?.prompt === 'publishOverflow'
              ? 'Click a neighboring book’s binding spaces.'
              : view?.moving
                ? `Click or drag your figure · ${view.moving.remaining ?? 'any distance'} ${view.moving.remaining === null ? '' : 'steps remaining'}`
                : data.battle
                  ? 'Resolve the highlighted conflict using your cards and the choice panel.'
                  : view?.prompt === 'turn'
                    ? 'Click an empty space to place an Inkling, or your Inkling to leave a memory.'
                    : 'Follow the current choice; highlighted pieces show available targets.'}
        </div>
      </div>
    </section>
  );
}
