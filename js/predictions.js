// Predictions module — pre-draft guessing game.
// Anyone can submit predictions for a specific draft room BEFORE the draft ends.
// After the draft completes, an auto-scorer runs.

import { db, ref, get, set, update, onValue, runTransaction, remove } from "./firebase-init.js";

const QUESTIONS = [
  { id: 'firstPick',    label: "First pick", perCaptain: true,
    help: "Who does each captain take with their #1 pick?" },
  { id: 'biggestSteal', label: "Biggest steal of the draft", perCaptain: false,
    help: "Which player will be the sneakiest good pick (drafted late but great stats)?" },
  { id: 'biggestReach', label: "Biggest reach of the draft", perCaptain: false,
    help: "Which player will be drafted way earlier than their stats suggest?" },
  { id: 'mvp',          label: "Draft-day MVP", perCaptain: false,
    help: "Which drafted player has the highest OVR at reveal?" },
  { id: 'undrafted',    label: "First player left undrafted", perCaptain: false,
    help: "Of the players who don't make a team, which has the highest OVR?" }
];

export function getPredictionQuestions() { return QUESTIONS; }

/** Open predictions for a specific draft room (commissioner action) */
export async function openPredictions(roomId) {
  await set(ref(db, `predictions/${roomId}/meta`), {
    open: true,
    openedAt: Date.now()
  });
}

/** Close predictions (usually done automatically when draft finishes) */
export async function closePredictions(roomId) {
  await update(ref(db, `predictions/${roomId}/meta`), { open: false, closedAt: Date.now() });
}

/** Fetch prediction meta for a room */
export async function getPredictionMeta(roomId) {
  const snap = await get(ref(db, `predictions/${roomId}/meta`));
  return snap.val();
}

/** Fetch a specific participant's submission */
export async function getMyPrediction(roomId, participantId) {
  const snap = await get(ref(db, `predictions/${roomId}/entries/${participantId}`));
  return snap.val();
}

/** Submit or overwrite a prediction */
export async function submitPrediction(roomId, participantId, nickname, answers) {
  await set(ref(db, `predictions/${roomId}/entries/${participantId}`), {
    nickname: String(nickname || 'Anonymous').slice(0, 30),
    answers,
    submittedAt: Date.now()
  });
}

/** List all entries for a room */
export async function listEntries(roomId) {
  const snap = await get(ref(db, `predictions/${roomId}/entries`));
  const val = snap.val() || {};
  return Object.entries(val).map(([id, data]) => ({ id, ...data }));
}

/** Subscribe to entries in real time (for leaderboard live-updates) */
export function watchEntries(roomId, callback) {
  return onValue(ref(db, `predictions/${roomId}/entries`), (snap) => {
    const val = snap.val() || {};
    callback(Object.entries(val).map(([id, data]) => ({ id, ...data })));
  });
}

/** Compute correct answers from a completed draft state.
 *  Returns { firstPick: {c1: playerId, c2: ...}, biggestSteal: playerId, ... }
 */
export function computeAnswers(draft) {
  if (!draft || !draft.picks || !draft.picks.length) return null;
  const picks = draft.picks;
  const players = draft.players;
  const playersById = Object.fromEntries(players.map(p => [p.id, p]));
  const captains = draft.captains;
  const numCaptains = captains.length;

  const answers = {};

  // First pick per captain
  const firstPick = {};
  for (let cIdx = 0; cIdx < numCaptains; cIdx++) {
    const first = picks.find(p => p.captainIdx === cIdx);
    if (first) firstPick[captains[cIdx].id] = first.playerId;
  }
  answers.firstPick = firstPick;

  const pickedIds = new Set(picks.map(p => p.playerId));
  const draftedPlayers = picks.map(p => playersById[p.playerId]).filter(Boolean);
  const undraftedPlayers = players.filter(p => !pickedIds.has(p.id));

  // Biggest steal = highest OVR drafted in the SECOND HALF of the draft
  const halfway = Math.floor(picks.length / 2);
  const lateHalf = picks.slice(halfway).map(p => playersById[p.playerId]).filter(Boolean);
  const biggestSteal = lateHalf.length
    ? lateHalf.reduce((best, p) => (!best || p.overall > best.overall) ? p : best, null)
    : null;
  answers.biggestSteal = biggestSteal ? biggestSteal.id : null;

  // Biggest reach = lowest OVR drafted in the FIRST HALF
  const earlyHalf = picks.slice(0, halfway).map(p => playersById[p.playerId]).filter(Boolean);
  const biggestReach = earlyHalf.length
    ? earlyHalf.reduce((worst, p) => (!worst || p.overall < worst.overall) ? p : worst, null)
    : null;
  answers.biggestReach = biggestReach ? biggestReach.id : null;

  // MVP = highest OVR drafted overall
  const mvp = draftedPlayers.length
    ? draftedPlayers.reduce((best, p) => (!best || p.overall > best.overall) ? p : best, null)
    : null;
  answers.mvp = mvp ? mvp.id : null;

  // Undrafted top = highest OVR among undrafted
  const topUndrafted = undraftedPlayers.length
    ? undraftedPlayers.reduce((best, p) => (!best || p.overall > best.overall) ? p : best, null)
    : null;
  answers.undrafted = topUndrafted ? topUndrafted.id : null;

  return answers;
}

/** Score a single submission against the true answers */
export function scoreSubmission(submission, correctAnswers, captains) {
  if (!submission || !correctAnswers) return { total: 0, breakdown: {} };
  const breakdown = {};
  let total = 0;
  for (const q of QUESTIONS) {
    if (q.perCaptain) {
      // First pick per captain
      for (const cap of captains) {
        const key = `${q.id}:${cap.id}`;
        const guess = submission.answers?.[key];
        const truth = correctAnswers[q.id]?.[cap.id];
        const correct = guess && truth && guess === truth;
        breakdown[key] = { guess, truth, correct };
        if (correct) total++;
      }
    } else {
      const guess = submission.answers?.[q.id];
      const truth = correctAnswers[q.id];
      const correct = guess && truth && guess === truth;
      breakdown[q.id] = { guess, truth, correct };
      if (correct) total++;
    }
  }
  return { total, breakdown };
}

/** Generate a random participant ID (stored in localStorage per browser) */
export function getParticipantId() {
  let id = localStorage.getItem('predParticipantId');
  if (!id) {
    id = 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    localStorage.setItem('predParticipantId', id);
  }
  return id;
}
