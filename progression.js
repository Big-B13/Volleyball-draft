// Shared persistence for completed simulator matches.
import { db, ref, set, get } from './firebase-init.js';
import { recordMatchForChemistry } from './chemistry.js';

export async function saveCompletedMatch({ match, leagueId='gomi-cup', mode='2d', ownerUid=null }) {
  if (!match?.matchOver) return null;
  const id = `sim-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const roster = side => [...(match[side].lineup||[]).map(s=>s?.player), ...(match[side].bench||[])].filter(Boolean).map(p=>p.id);
  const result = { id, leagueId, mode, ownerUid, createdAt:Date.now(), winner:match.winner,
    setsHome:match.setsHome, setsAway:match.setsAway,
    home:{name:match.home.name,color:match.home.color,players:roster('home')},
    away:{name:match.away.name,color:match.away.color,players:roster('away')} };
  await set(ref(db, `matchResults/${id}`), result);
  await Promise.all([
    recordMatchForChemistry(leagueId, result.home.players, match.winner==='home'),
    recordMatchForChemistry(leagueId, result.away.players, match.winner==='away')
  ]);
  return result;
}
export async function getPlayerMatchHistory(pid, limit=12) {
  const all=(await get(ref(db,'matchResults'))).val()||{};
  return Object.values(all).filter(m=>(m.home?.players||[]).includes(pid)||(m.away?.players||[]).includes(pid)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,limit);
}
