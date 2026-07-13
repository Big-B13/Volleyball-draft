// Central authentication + role management for The Gomi Cup
// Uses Firebase Auth (email/password) with a username → fake email mapping.
// Stores role + linked-captain info in Realtime Database at /users/<uid>.

import {
  auth, db, ref, set, get, update, remove,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updatePassword
} from "./firebase-init.js";

const USERNAME_DOMAIN = "@gomicup.local";

/** Convert a display username → the fake email Firebase requires */
export function usernameToEmail(username) {
  return String(username).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '') + USERNAME_DOMAIN;
}
export function emailToUsername(email) {
  return String(email || '').replace(USERNAME_DOMAIN, '');
}

/** Sign in with a username + password */
export async function login(username, password) {
  const email = usernameToEmail(username);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/** Sign up a NEW user with an invite code. Returns the created user. */
export async function signUpWithInvite(username, password, inviteCode) {
  const codeInfo = await consumeInviteCode(inviteCode);
  if (!codeInfo) throw new Error('Invalid or already-used invite code.');

  const email = usernameToEmail(username);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  // Save user profile
  await set(ref(db, `users/${uid}`), {
    username: username.trim(),
    email,
    role: codeInfo.role || 'viewer',
    captainId: codeInfo.captainId || null,
    displayName: codeInfo.displayName || username.trim(),
    createdAt: Date.now()
  });

  // Mark invite code as consumed
  await update(ref(db, `inviteCodes/${inviteCode.toUpperCase()}`), {
    consumed: true,
    consumedBy: uid,
    consumedAt: Date.now()
  });

  return cred.user;
}

export function logout() { return signOut(auth); }

/** Fetch the profile (username, role) for a Firebase user */
export async function getUserProfile(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.val();
}

/** Subscribe to auth state changes. Callback gets { user, profile } or null. */
export function watchAuth(cb) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return cb(null);
    const profile = await getUserProfile(user.uid);
    cb({ user, profile });
  });
}

/** Consume (validate & lock) an invite code. Returns the code data or null. */
async function consumeInviteCode(code) {
  const key = String(code).trim().toUpperCase();
  const snap = await get(ref(db, `inviteCodes/${key}`));
  const data = snap.val();
  if (!data) return null;
  if (data.consumed) return null;
  return data;
}

/** Commissioner: create a new invite code. */
export async function createInviteCode({ code, role, captainId, displayName }) {
  const key = String(code).trim().toUpperCase();
  await set(ref(db, `inviteCodes/${key}`), {
    role: role || 'viewer',
    captainId: captainId || null,
    displayName: displayName || '',
    consumed: false,
    createdAt: Date.now()
  });
  return key;
}

/** Commissioner: list all invite codes */
export async function listInviteCodes() {
  const snap = await get(ref(db, 'inviteCodes'));
  const val = snap.val() || {};
  return Object.entries(val).map(([k, v]) => ({ code: k, ...v }));
}

/** Commissioner: list all users */
export async function listUsers() {
  const snap = await get(ref(db, 'users'));
  const val = snap.val() || {};
  return Object.entries(val).map(([uid, v]) => ({ uid, ...v }));
}

/** Commissioner: delete an invite code */
export async function deleteInviteCode(code) {
  await remove(ref(db, `inviteCodes/${String(code).toUpperCase()}`));
}

/** Commissioner: change a user's role or captain link */
export async function updateUserRole(uid, patch) {
  await update(ref(db, `users/${uid}`), patch);
}

// ============ PAGE GUARD ============
/**
 * Redirect to login if not signed in. Call at the top of a protected page.
 * Optionally require a minimum role: 'viewer' | 'captain' | 'commissioner'.
 */
const ROLE_LEVELS = { viewer: 1, captain: 2, commissioner: 3 };

export function guardPage({ requireRole = 'viewer', redirectTo = null } = {}) {
  const returnUrl = encodeURIComponent(location.pathname + location.search);
  const loginPath = new URL('login.html', location.href).pathname;
  const isRelative = !loginPath.startsWith('/');
  const target = redirectTo || `${loginPath}?next=${returnUrl}`;

  // Show a "checking auth..." overlay so protected content isn't briefly visible
  const overlay = document.createElement('div');
  overlay.id = 'auth-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: #0f172a; color: #f1f5f9;
    display: flex; align-items: center; justify-content: center;
    font-family: sans-serif; font-size: 1.1rem;
  `;
  overlay.textContent = '🔒 Checking access...';
  document.body.appendChild(overlay);

  return new Promise((resolve) => {
    watchAuth(async (session) => {
      if (!session) {
        location.replace(target);
        return;
      }
      const { user, profile } = session;
      if (!profile) {
        alert("Your account exists but has no profile. Ask the commissioner to fix this.");
        await signOut(auth);
        location.replace(target);
        return;
      }
      const need = ROLE_LEVELS[requireRole] || 1;
      const have = ROLE_LEVELS[profile.role] || 1;
      if (have < need) {
        overlay.innerHTML = `
          <div style="text-align:center; padding:20px;">
            <div style="font-size:2rem; margin-bottom:12px;">🚫</div>
            <div>You need <strong>${requireRole}</strong> access to view this page.</div>
            <div style="margin-top:8px; color:#94a3b8; font-size:0.9rem;">You are: ${profile.role}</div>
            <div style="margin-top:20px;">
              <a href="./index.html" style="color:#fbbf24;">← Back to home</a>
            </div>
          </div>
        `;
        return;
      }
      overlay.remove();
      resolve({ user, profile });
    });
  });
}

/** Small UI helper: render "logged in as X (role)" + logout button into an element */
export function renderAuthBadge(el, profile) {
  if (!el) return;
  const roleEmoji = { viewer: '👀', captain: '🎖️', commissioner: '👑' }[profile.role] || '👤';
  el.innerHTML = `
    <div style="display:inline-flex; gap:10px; align-items:center;
                padding: 6px 12px; background: rgba(30,41,59,0.7); border-radius: 20px;
                font-size: 0.85rem; color:#e2e8f0;">
      <span>${roleEmoji}</span>
      <span><strong>${profile.displayName || profile.username}</strong> · ${profile.role}</span>
      <button onclick="window.__logout()" style="background:transparent; border:1px solid #475569; color:#94a3b8; padding:3px 10px; border-radius:12px; cursor:pointer; font-size:0.75rem;">Log out</button>
    </div>
  `;
  window.__logout = async () => {
    if (!confirm('Log out?')) return;
    await logout();
    // Hard reload to bust any cached content
    location.href = './login.html';
  };
}
