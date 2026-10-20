import { Fragment } from 'react';
import { content } from './game/chapters';
import { Glyph } from './TabletopBook';

/** Shared compact ink notation, including accessible text for the symbol. */
export function RulesText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\d+ ink)/gi).map((part, i) =>
        /^(\d+) ink$/i.test(part) ? (
          <span className="inkNotation" key={i} aria-label={part}>
            {part.split(' ')[0]}
            <Glyph kind="ink" />
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
export default function GameCard({
  kind,
  design,
  cost,
  boost = 1,
  actions = [],
}: {
  kind: 'character' | 'subplot' | 'twist';
  design: number;
  cost?: number;
  boost?: number;
  actions?: { key: string; label: string; run: () => void }[];
}) {
  const d =
    kind === 'character'
      ? content.characters[design]
      : kind === 'twist'
        ? content.twists[design]
        : content.subplots[design];
  const genre = d.genre === 'Voyages' ? 0 : d.genre === 'Epics' ? 1 : 2;
  return (
    <article className={`gameCard card-${kind} genre${genre}`} aria-label={`${kind}: ${d.name}`}>
      <div className="cardArt" aria-label="Placeholder artwork">
        <Glyph kind={kind === 'character' ? 'book' : kind === 'twist' ? 'conflict' : 'draw'} />
        <small>{d.genre}</small>
      </div>
      <div className="cardBody">
        <span className="cardType">{kind}</span>
        <h3>{d.name}</h3>
        {kind === 'character' ? (
          <>
            <strong className="cardPower">
              {content.characters[design].power}
              <Glyph kind="conflict" />
            </strong>
            <p>
              <RulesText text={content.characters[design].ability} />
            </p>
          </>
        ) : kind === 'twist' ? (
          <p className="twistEffect">
            {content.twists[design].effect
              .split(/(\+\d+)/)
              .map((s, i) =>
                /^\+\d+$/.test(s) ? <strong key={i}>{s}</strong> : <Fragment key={i}>{s}</Fragment>,
              )}
          </p>
        ) : (
          <>
            <p>
              <RulesText text={content.subplots[design].condition} />
            </p>
            <div className="subplotRewards">
              <p>
                <b>Keep</b>
                <RulesText text={content.subplots[design].ongoing} />
              </p>
              <span className="rewardOr">or</span>
              <p>
                <b>Take now</b>
                <RulesText text={content.subplots[design].instant} />
              </p>
            </div>
          </>
        )}
      </div>
      {kind !== 'character' && (
        <footer
          className="cardCost"
          aria-label={`${cost ?? (kind === 'twist' ? content.twists[design].cost : 1)} ink${kind === 'subplot' ? `: +${boost} power` : ''}`}
        >
          {cost ?? (kind === 'twist' ? content.twists[design].cost : 1)}
          <Glyph kind="ink" />
          {kind === 'subplot' && <>: +{boost}</>}
        </footer>
      )}
      {actions.length > 0 && (
        <div className="cardActions">
          {actions.map((a) => (
            <button key={a.key} onClick={a.run}>
              <RulesText text={a.label} />
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
