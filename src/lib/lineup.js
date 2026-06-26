/* US-7 — Best lineup auto-suggestion.
   Given a formation's slots, the squad, and each player's per-position ratings
   (US-2, via getPositionRatings), produce an assignment that places the
   strongest-rated players in their best-suited positions. The result is a plain
   { slotIndex: playerId } map the Lineup builder treats as an editable starting
   point — the coach can drag to adjust before saving. */

import { POSITION_LINE } from "../data/static.js";

// A specialist in the exact slot position is always preferred. A player rated in
// the same line but a different position is a small step down; a player with no
// rating in the slot's line at all is only used as a last resort.
const SAME_LINE_PENALTY = 6;
const CROSS_LINE_PENALTY = 45;

// How well a player fits a slot position, drawing on their per-position ratings.
// `byPosFor` is the player's { position: overall } map.
export function fitScore(byPosFor, slotPosition) {
  const byPos = byPosFor || {};
  const exact = byPos[slotPosition];
  if (exact != null) return exact;

  const targetLine = POSITION_LINE[slotPosition];
  let sameLineBest = -Infinity;
  for (const [pos, val] of Object.entries(byPos)) {
    if (POSITION_LINE[pos] === targetLine && val > sameLineBest) sameLineBest = val;
  }
  if (sameLineBest > -Infinity) return sameLineBest - SAME_LINE_PENALTY;

  const anyVals = Object.values(byPos);
  const anyBest = anyVals.length ? Math.max(...anyVals) : 0;
  return anyBest - CROSS_LINE_PENALTY;
}

// Builds the suggested XI. Only available players (availability !== "out") are
// considered. Greedy by best fit: every (slot, player) pairing is scored, then
// the highest-scoring pairings are locked in first, each player and slot used at
// most once. With the squad's per-position ratings this reliably lands the best
// available player in each role. Returns { slotIndex: playerId }.
export function suggestLineup(slots, players, ratings) {
  const available = (players || []).filter(p => p.availability !== "out");

  const edges = [];
  slots.forEach((s, i) => {
    for (const p of available) {
      edges.push({ slot: i, pid: p.id, score: fitScore(ratings[p.id], s.slot) });
    }
  });
  // Highest fit first; stable tiebreak so the result is deterministic.
  edges.sort((a, b) => b.score - a.score || a.slot - b.slot);

  const assign = {};
  const usedSlots = new Set();
  const usedPlayers = new Set();
  for (const e of edges) {
    if (usedSlots.has(e.slot) || usedPlayers.has(e.pid)) continue;
    assign[e.slot] = e.pid;
    usedSlots.add(e.slot);
    usedPlayers.add(e.pid);
    if (usedSlots.size === slots.length) break;
  }
  return assign;
}
