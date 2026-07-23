// Authentication, membership requests, roles and account profiles for The Gomi Cup.
import { auth, db, ref, set, get, update, remove, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "./firebase-init.js";

const USERNAME_DOMAIN = "@gomicup.local";
const ROLE_LEVELS = { viewer: 1, captain: 2, commissioner: 3 };
export function usernameToEmail(username) { return String(username).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '') + USERNAME_DOMAIN; }
export function emailToUsername(email) { return String(email || '').replace(USERNAME_DOMAIN, ''); }
export async function login(username, password) { return (await signInWithEmailAndPassword(auth, usernameToEmail(username), password)).user; }

/** Creates a usable-but-pending account. Admin approval unlocks member-only actions. */
export async function requestAccess({ username, password, displayName, requestNote = '', favoriteClub = null }) {
  const cleanUsername = String(username || '').trim();
  if (!/^[a-zA-Z0-9._-]{3,24}$/.test(cleanUsername)) throw new Error('Use 3–24 letters, numbers, dots, underscores, or dashes for your username.');
  const email = usernameToEmail(cleanUsername);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await set(ref(db, `users/${cred.user.uid}`), {
    username: cleanUsername, email, displayName: String(displayName || cleanUsername).trim(),
    role: 'viewer', status: 'pending', favoriteClub, onboardingComplete: false,
    requestNote: String(requestNote || '').trim().slice(0, 500), linkedPlayerId: null,
    createdAt: Date.now(), requestedAt: Date.now()
  });
  return cred.user;
}

// Legacy commissioner invite flow remains available for existing private codes.
export async function signUpWithInvite(username, password, inviteCode) {
  const key = String(inviteCode).trim().toUpperCase(); const snap = await get(ref(db, `inviteCodes/${key}`)); const codeInfo = snap.val();
  if (!codeInfo || codeInfo.consumed) throw new Error('Invalid or already-used invite code.');
  const email = usernameToEmail(username); const cred = await createUserWithEmailAndPassword(auth, email, password); const uid = cred.user.uid;
  await set(ref(db, `users/${uid}`), { username: username.trim(), email, role: codeInfo.role || 'viewer', status: 'approved', captainId: codeInfo.captainId || null, displayName: codeInfo.displayName || username.trim(), favoriteClub: null, onboardingComplete: false, linkedPlayerId: null, createdAt: Date.now(), approvedAt: Date.now() });
  await update(ref(db, `inviteCodes/${key}`), { consumed:true, consumedBy:uid, consumedAt:Date.now() }); return cred.user;
}
export function logout() { return signOut(auth); }
export async function getUserProfile(uid) { return (await get(ref(db, `users/${uid}`))).val(); }
export function watchAuth(cb) { return onAuthStateChanged(auth, async user => cb(user ? { user, profile: await getUserProfile(user.uid) } : null)); }
export async function completeOnboarding(uid, favoriteClub) {
  await update(ref(db, `users/${uid}`), { favoriteClub, onboardingComplete: true, onboardingCompletedAt: Date.now() });
  // Also persist locally: campaign.html / campaign-store.js resolve the player's
  // club from localStorage('gomiSelectedClub'). Without this, everything
  // (storekeeper, loading lore, guide) silently falls back to Strigidae/Bader.
  try { localStorage.setItem('gomiSelectedClub', favoriteClub); } catch (e) {}
}
export async function createInviteCode({ code, role, captainId, displayName }) { const key=String(code).trim().toUpperCase(); await set(ref(db,`inviteCodes/${key}`),{role:role||'viewer',captainId:captainId||null,displayName:displayName||'',consumed:false,createdAt:Date.now()}); return key; }
export async function listInviteCodes() { const v=(await get(ref(db,'inviteCodes'))).val()||{}; return Object.entries(v).map(([code, data])=>({code,...data})); }
export async function listUsers() { const v=(await get(ref(db,'users'))).val()||{}; return Object.entries(v).map(([uid,data])=>({uid,...data})); }
export async function deleteInviteCode(code) { return remove(ref(db,`inviteCodes/${String(code).toUpperCase()}`)); }
export async function updateUserRole(uid, patch) { return update(ref(db,`users/${uid}`),patch); }
export async function approveMember(uid, { linkedPlayerId = null, role = 'viewer' } = {}) { return update(ref(db, `users/${uid}`), { status:'approved', role, linkedPlayerId:linkedPlayerId || null, approvedAt:Date.now(), declinedAt:null }); }
export async function declineMember(uid) { return update(ref(db, `users/${uid}`), { status:'declined', declinedAt:Date.now() }); }
export async function resetUser(uid) { const userData=await getUserProfile(uid); if(!userData) throw new Error('User not found.'); const codes=(await get(ref(db,'inviteCodes'))).val()||{}; let freedCode=null; for(const [code,data] of Object.entries(codes)) if(data.consumedBy===uid){await update(ref(db,`inviteCodes/${code}`),{consumed:false,consumedBy:null,consumedAt:null});freedCode=code;} await remove(ref(db,`users/${uid}`)); return {authUid:uid,freedCode,username:userData.username,displayName:userData.displayName}; }

export function guardPage({ requireRole='viewer', requireApproved=false, redirectTo=null }={}) {
 const returnUrl=encodeURIComponent(location.pathname+location.search); const target=redirectTo||`./login.html?next=${returnUrl}`;
 const overlay=document.createElement('div'); overlay.id='auth-overlay'; overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:#0f172a;color:#f1f5f9;display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-size:1.1rem;'; overlay.textContent='🔒 Checking access…'; document.body.appendChild(overlay);
 return new Promise(resolve=>watchAuth(async session=>{ if(!session){location.replace(target);return;} const {user,profile}=session; if(!profile){await logout();location.replace(target);return;} if(requireApproved && (profile.status === 'pending' || profile.status === 'declined')){ overlay.innerHTML='<div style="text-align:center;padding:24px"><div style="font-size:2rem">⏳</div><p>Your membership is still pending approval.</p><a href="./index.html" style="color:#fbbf24">Back to dashboard</a></div>';return;} if((ROLE_LEVELS[profile.role]||1)<(ROLE_LEVELS[requireRole]||1)){overlay.innerHTML='<div style="text-align:center;padding:24px">🚫 You do not have access to this page.<br><br><a href="./index.html" style="color:#fbbf24">Back to dashboard</a></div>';return;} overlay.remove();resolve({user,profile}); }));
}
export function renderAuthBadge(el, profile) { if(!el)return; const pending=profile.status==='pending'; const club=profile.favoriteClub ? ` · ${profile.favoriteClub}` : ''; el.innerHTML=`<div style="display:inline-flex;gap:10px;align-items:center;padding:6px 12px;background:rgba(30,41,59,.7);border-radius:20px;font-size:.85rem;color:#e2e8f0"><span>${pending?'⏳':'👤'}</span><span><strong>${profile.displayName||profile.username}</strong> · ${pending?'pending approval':profile.role}${club}</span><button onclick="window.__logout()" style="background:transparent;border:1px solid #475569;color:#94a3b8;padding:3px 10px;border-radius:12px;cursor:pointer;font-size:.75rem">Log out</button></div>`; window.__logout=async()=>{sessionStorage.removeItem('gomiPendingIntroSeen');await logout();location.href='./index.html';}; }

/** Member-facing correction request. Commissioners review these in Admin. */
export async function submitProfileCorrection(uid, { message, playerId = null }) {
  const id = `request-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  await set(ref(db, `profileCorrections/${id}`), { uid, playerId, message: String(message||'').trim().slice(0,500), status:'open', createdAt:Date.now() });
  return id;
}
export async function listProfileCorrections() { const v=(await get(ref(db,'profileCorrections'))).val()||{}; return Object.entries(v).map(([id,x])=>({id,...x})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)); }
export async function resolveProfileCorrection(id) { return update(ref(db,`profileCorrections/${id}`),{status:'resolved',resolvedAt:Date.now()}); }
