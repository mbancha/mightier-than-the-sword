# Chapters architecture

Current runtime: ChapterApp.tsx -> game/chapters.ts -> data/content.json.redesign. game/chapterBot.ts selects from a player projection. Previous game modules are legacy compatibility references, not active runtime.

State is serializable. Randomness lives in state.rng. newGame/applyAction/legalActions are the rules boundary. applyAction clones before checking actions so failures do not commit mutations. Pending choices are explicit data jobs. UI uses playerView, excluding opponents hands, deck order, random state, hidden bookmark pool and battle snapshots.

Book IDs remain their catalog IDs and page IDs are book ID times two plus side. Removal never reindexes surviving books. Adjacency is calculated from live axial positions. Gap closure offers a deterministic suggestion and owner-controlled adjustments; acceptance requires connectedness and at least two neighbors per book.

Normal routes finalize explicitly before arrival effects. Placement and conflict events snapshot eligible Subplots. Ongoing rewards are stored as design IDs; immediate/played cards go to the shared discard. Same-named ongoing rewards do not duplicate.

Chapter saves use the chapters-1 edition and complete private state plus undo history. Legacy saves are rejected. No print regeneration is part of this edition.
