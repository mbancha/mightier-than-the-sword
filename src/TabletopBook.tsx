import { useState } from 'react';
import { RulesText } from './GameCard';
import source from './data/content.json';
import { content, bookmarkNames, bookmarkText, type playerView } from './game/chapters';
type View = ReturnType<typeof playerView>;
export function Meeple({
  owner = 0,
  label = '',
  small = false,
}: {
  owner?: number;
  label?: string;
  small?: boolean;
}) {
  return (
    <svg
      className={`meeple seat${owner} ${small ? 'small' : ''}`}
      viewBox="0 0 40 44"
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <path d="M14 11a6 6 0 1 1 12 0v3l10 6-4 7-7-4 7 17H22l-2-10-2 10H8l7-17-7 4-4-7 10-6Z" />
      <text x="20" y="23" textAnchor="middle">
        {['●', '◆', '＋', '≡'][owner]}
      </text>
    </svg>
  );
}
export function Glyph({ kind }: { kind: string }) {
  return (
    <svg className="glyph" viewBox="0 0 24 24" aria-hidden="true">
      {kind === 'ink' ? (
        <path d="M12 2C10 7 5 11 5 15a7 7 0 0 0 14 0c0-4-5-8-7-13Z" />
      ) : kind === 'draw' ? (
        <>
          <rect x="3" y="3" width="12" height="15" rx="2" />
          <rect x="8" y="6" width="12" height="15" rx="2" />
        </>
      ) : kind === 'move' ? (
        <>
          <path d="m3 12 15 0m-5-6 6 6-6 6" fill="none" />
        </>
      ) : kind === 'conflict' ? (
        <>
          <path d="m4 3 16 18M20 3 4 21M2 15l7 7M15 22l7-7" fill="none" />
        </>
      ) : kind === 'book' ? (
        <>
          <path d="M12 5Q5 1 2 5v15q5-3 10 0 5-3 10 0V5q-5-4-10 0Z" fill="none" />
          <path d="M12 5v15" fill="none" />
        </>
      ) : (
        <>
          <path d="M3 15v7h18v-7" fill="none" />
          <path d="M8 4h8v10H8Z" />
        </>
      )}
    </svg>
  );
}
export function Reward({ reward }: { reward: (string | number)[] }) {
  const [cost, kind, n] = reward;
  return (
    <span
      className="reward"
      aria-label={`${cost} ink: ${kind === 'draw' ? 'draw' : kind === 'ink' ? 'gain' : 'place in overflow'} ${n} ${kind === 'draw' ? 'cards' : kind === 'ink' ? 'ink' : 'Inklings'}`}
    >
      <span className="cost">
        {cost}
        <Glyph kind="ink" />
      </span>
      <span className="rewardArrow">→</span>
      <span>
        {n}
        <Glyph kind={String(kind)} />
      </span>
    </span>
  );
}
function Badge({ id }: { id: number }) {
  return (
    <span className="themeBadge" aria-hidden="true">
      {id === 0 ? (
        '⚓'
      ) : id === 6 ? (
        '♜'
      ) : id === 8 ? (
        '◐'
      ) : (
        <Glyph kind={[2, 4, 7].includes(id) ? 'conflict' : 'move'} />
      )}
    </span>
  );
}
export default function TabletopBook({
  b,
  view,
  selected,
  onSelect,
  sourcePage,
  act,
  enabled,
}: {
  b: View['books'][number];
  view: View;
  selected: number | null;
  onSelect: (id: number) => void;
  sourcePage: number | undefined;
  act: (key: string) => void;
  enabled: boolean;
}) {
  const [inspect, setInspect] = useState(false);
  const [figureInfo, setFigureInfo] = useState<string | null>(null);
  const actions = enabled ? view.actions : [];
  const pageAction = (side: number) =>
    actions.find((a) => {
      const k = a.key.split(':');
      return (
        (k[0] === 'setup' && +k[1] === b.id && +k[2] === side) ||
        (k[0] === 'step' && +k[1] === b.id * 2 + side) ||
        (k[0] === 'move' && (selected === null || +k[1] === selected) && +k[2] === b.id * 2 + side)
      );
    });
  const placement = (k: number | null) =>
    sourcePage !== undefined && Math.floor(sourcePage / 2) === b.id
      ? actions.find((a) => a.key === `place:${k}`)
      : actions.find(
          (a) =>
            a.key.split('@')[0] === `place:${k}` &&
            (a as { page?: number }).page !== undefined &&
            Math.floor((a as { page?: number }).page! / 2) === b.id,
        );
  const split = source.books[b.id].page_slots[0];
  const slot = (k: number) => {
    const owner = b.slots[k],
      a = placement(k),
      special = (b.id === 0 && k === 1) || (b.id === 6 && k === 0) || (b.id === 8 && k === 1);
    return (
      <div className="trackCell" key={k}>
        <button
          className={`inkSpace ${a ? 'legalTarget' : ''}`}
          aria-disabled={!a}
          onClick={() => a && act(a.key)}
          aria-label={`${source.books[b.id].title}, space ${k + 1}: ${owner === null ? 'empty' : view.players[owner].name}${a ? ', place Inkling here' : ''}`}
          title={
            a?.label ?? `Space ${k + 1}: ${owner === null ? 'empty' : view.players[owner].name}`
          }
        >
          {owner !== null ? <Meeple owner={owner} /> : <span className="emptySocket" />}
          {special && <Badge id={b.id} />}
        </button>
        {k > 0 && k < b.slots.length - 1 ? (
          <Reward reward={content.spaceBonuses[b.id][k - 1]} />
        ) : (
          <span className="noReward" />
        )}
      </div>
    );
  };
  const over = placement(null);
  return (
    <article className={`visualBook genre${Math.floor(b.id / 3)}`} data-book-id={b.id}>
      <div className="visualBookHeading">
        <div>
          <span className="genreLabel">{source.books[b.id].genre}</span>
          <h3>{source.books[b.id].title}</h3>
        </div>
        <button
          className="effectBadge"
          title={content.bookEffects[b.id].effect}
          aria-label={`Inspect ${source.books[b.id].title} effect`}
          onClick={() => setInspect((v) => !v)}
        >
          <Badge id={b.id} />
        </button>
        {b.mark !== null && (
          <details className="visualBookmark">
            <summary title={bookmarkNames[b.mark]}>
              <Glyph
                kind={
                  b.mark === 0 || b.mark === 6 || b.mark === 7
                    ? 'conflict'
                    : b.mark === 2 || b.mark === 3
                      ? 'ink'
                      : b.mark === 9
                        ? 'move'
                        : b.mark === 1
                          ? 'draw'
                          : 'book'
                }
              />
              <span>{bookmarkNames[b.mark]}</span>
            </summary>
            <p>
              <RulesText text={bookmarkText[b.mark]} />
            </p>
          </details>
        )}
      </div>
      <div className="bookStatus">
        {b.mark === null && <span className="claimReady" aria-label="Bookmark claimed: next conflict winner takes this book">Bookmark claimed · Win to collect</span>}

      </div>
      <div className="openBook">
        {[0, 1].map((side) => {
          const a = pageAction(side);
          return (
            <div className={`visualPage ${a ? 'availablePage' : ''}`} key={side}>
              <div className="figureLane">
                {view.players.flatMap((p, owner) =>
                  p.figures
                    .filter((f) => f.page === b.id * 2 + side)
                    .map((f) => (
                      <button
                        key={f.id}
                        className={`standee seat${owner} ${selected === f.id ? 'selectedFigure' : ''}`}
                        title={`${p.name}: ${content.characters[f.id].name}${f.primary ? ' — protagonist' : ''}. ${content.characters[f.id].ability}`}
                        aria-label={`${p.name}, ${content.characters[f.id].name}${f.primary ? ', protagonist' : ''}`}
                        onClick={() => {
                          setFigureInfo(
                            `${content.characters[f.id].name} · ${content.characters[f.id].power} base power. ${content.characters[f.id].ability}`,
                          );
                          if (owner === view.actor) {
                            const source = actions.find((a) => a.key === `source:${f.id}`);
                            if (source) act(source.key);
                            else onSelect(f.id);
                          }
                        }}
                      >
                        <span className="portrait">
                          {content.characters[f.id].name
                            .replace(/^(Captain |Phileas |Dr\. )/, '')
                            .slice(0, 3)
                            .toUpperCase()}
                        </span>
                        {f.primary && <span className="primaryStar">★</span>}
                      </button>
                    )),
                )}
              </div>
              {a && (
                <button className="pageDestination" onClick={() => act(a.key)} aria-label={a.label}>
                  <Glyph kind="move" />
                  <span>
                    {view.phase === 'setup' ? (
                      'Start here'
                    ) : a.key.startsWith('step:') ? (
                      <RulesText text="1 ink: move" />
                    ) : (
                      'Move here'
                    )}
                  </span>
                </button>
              )}
              <div className="pageTrack">
                {b.slots.map((_, k) => ((k < split ? 0 : 1) === side ? slot(k) : null))}
              </div>
            </div>
          );
        })}
      </div>
      <div
        className={`overflowTray ${over ? 'legalTarget' : ''}`}
        aria-label={`${source.books[b.id].title} overflow`}
      >
        <span className="trayLabel">
          <Glyph kind="overflow" />
          Overflow
        </span>
        <div className="overflowPieces">
          {b.overflow.flatMap((n, p) =>
            Array.from({ length: n }, (_, i) => (
              <Meeple
                key={`${p}-${i}`}
                owner={p}
                label={`${view.players[p].name} overflow Inkling`}
              />
            )),
          )}
        </div>
        {over && (
          <button className="overflowPlace" onClick={() => act(over.key)} aria-label={over.label}>
            ＋<Meeple owner={view.actor} small />
          </button>
        )}
      </div>
      {view.battle?.book === b.id && (
        <div className="battleTotals">
          {view.battle.participants.map((p) => (
            <span className={`seat${p}`} key={p}>
              <Meeple owner={p} small />
              <Glyph kind="conflict" />
              {view.battle!.power[p]}
            </span>
          ))}
        </div>
      )}
      {figureInfo && (
        <div className="bookInspector">
          <p>
            <RulesText text={figureInfo} />
          </p>
          <button onClick={() => setFigureInfo(null)}>Close character details</button>
        </div>
      )}
      {inspect && (
        <div className="bookInspector">
          <strong>{content.bookEffects[b.id].category}</strong>
          <p>
            <RulesText text={content.bookEffects[b.id].effect} />
          </p>
          <small>
            Page spaces resolve from left to right. Hover or focus a space or character for details.
          </small>
        </div>
      )}
    </article>
  );
}
