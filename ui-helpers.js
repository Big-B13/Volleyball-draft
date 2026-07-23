// ═══════════════════════════════════════════════════════════════════════
// GOMI CUP — UI HELPERS
// Reusable UI components: modals, confirmations, toasts, loaders
// ═══════════════════════════════════════════════════════════════════════

/**
 * Show a confirmation dialog.
 * @param {string} message - The question/warning text
 * @param {object} options
 * @param {string} options.confirmLabel - Label for confirm button (default: "Confirm")
 * @param {string} options.cancelLabel - Label for cancel button (default: "Cancel")
 * @param {string} options.confirmStyle - 'danger' | 'warning' | 'default' (default: 'danger')
 * @param {string} options.title - Optional modal title
 * @returns {Promise<boolean>} true = confirmed, false = cancelled
 */
export async function confirmDialog(message, options = {}) {
  const {
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    confirmStyle = "danger",
    title = null,
  } = options;

  return new Promise((resolve) => {
    // Remove any existing modal
    const existing = document.getElementById('confirm-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'confirm-modal-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.75);
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.15s ease;
    `;

    const confirmColors = {
      danger: { bg: '#dc2626', hover: '#b91c1c' },
      warning: { bg: '#f97316', hover: '#ea580c' },
      default: { bg: '#2563eb', hover: '#1d4ed8' },
    };
    const colors = confirmColors[confirmStyle] || confirmColors.default;

    overlay.innerHTML = `
      <div style="
        background: #0f172a; border: 1px solid #334155; border-radius: 16px;
        padding: 28px 32px; max-width: 420px; width: 90%;
        box-shadow: 0 25px 60px rgba(0,0,0,0.6);
        animation: slideUp 0.2s ease;
      ">
        ${title ? `<h3 style="color:#f8fafc; margin:0 0 12px; font-size:1.1rem; font-weight:700;">${title}</h3>` : ''}
        <p style="color:#94a3b8; font-size:0.95rem; line-height:1.6; margin:0 0 24px;">${message}</p>
        <div style="display:flex; gap:12px; justify-content:flex-end;">
          <button id="confirm-cancel" style="
            padding:10px 20px; border-radius:8px; border:1px solid #334155;
            background:#1e293b; color:#cbd5e1; font-weight:600; cursor:pointer;
            transition: all 0.15s;
          ">${cancelLabel}</button>
          <button id="confirm-ok" style="
            padding:10px 20px; border-radius:8px; border:none;
            background:${colors.bg}; color:#fff; font-weight:700; cursor:pointer;
            transition: background 0.15s;
          ">${confirmLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cancelBtn = document.getElementById('confirm-cancel');
    const okBtn = document.getElementById('confirm-ok');

    const cleanup = (result) => {
      overlay.style.animation = 'fadeOut 0.15s ease forwards';
      setTimeout(() => overlay.remove(), 150);
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onConfirm);
      resolve(result);
    };

    const onCancel = () => cleanup(false);
    const onConfirm = () => cleanup(true);

    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onConfirm);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });

    // Hover effects
    cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.borderColor = '#475569'; cancelBtn.style.color = '#fff'; });
    cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.borderColor = '#334155'; cancelBtn.style.color = '#cbd5e1'; });
    okBtn.addEventListener('mouseenter', () => { okBtn.style.background = colors.hover; });
    okBtn.addEventListener('mouseleave', () => { okBtn.style.background = colors.bg; });

    // Add keybind: Enter to confirm, Escape to cancel
    const keyHandler = (e) => {
      if (e.key === 'Escape') { cleanup(false); document.removeEventListener('keydown', keyHandler); }
      if (e.key === 'Enter') { cleanup(true); document.removeEventListener('keydown', keyHandler); }
    };
    document.addEventListener('keydown', keyHandler);
  });
}

/**
 * Show a text-input confirmation (for destructive codes like CLEARCOLLECTION)
 * @param {string} message - The warning text
 * @param {string} code - The code the user must type
 * @param {string} confirmLabel - Label for the confirm button
 * @returns {Promise<boolean>} true if code matched, false otherwise
 */
export async function confirmWithCode(message, code, confirmLabel = "Confirm") {
  return new Promise((resolve) => {
    const existing = document.getElementById('confirm-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'confirm-modal-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.75);
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.15s ease;
    `;

    overlay.innerHTML = `
      <div style="
        background: #0f172a; border: 1px solid #334155; border-radius: 16px;
        padding: 28px 32px; max-width: 460px; width: 90%;
        box-shadow: 0 25px 60px rgba(0,0,0,0.6);
        animation: slideUp 0.2s ease;
      ">
        <p style="color:#94a3b8; font-size:0.95rem; line-height:1.6; margin:0 0 16px;">${message}</p>
        <div style="
          background:#1e293b; border:1px solid #334155; border-radius:8px;
          padding:12px 14px; margin-bottom:20px; font-family:monospace;
          color:#fbbf24; font-size:0.9rem; letter-spacing:2px;
        ">TYPE: ${code}</div>
        <input id="code-input" type="text" placeholder="Type the code above..." style="
          width:100%; box-sizing:border-box;
          padding:12px 14px; border-radius:8px;
          border:1px solid #334155; background:#1e293b;
          color:#f8fafc; font-family:monospace; font-size:0.9rem;
          letter-spacing:1px; margin-bottom:20px;
          outline:none; transition:border-color 0.15s;
        "/>
        <div style="display:flex; gap:12px; justify-content:flex-end;">
          <button id="confirm-cancel" style="
            padding:10px 20px; border-radius:8px; border:1px solid #334155;
            background:#1e293b; color:#cbd5e1; font-weight:600; cursor:pointer;
          ">Cancel</button>
          <button id="confirm-ok" style="
            padding:10px 20px; border-radius:8px; border:none;
            background:#dc2626; color:#fff; font-weight:700; cursor:pointer;
            opacity:0.5; transition:opacity 0.15s;
          " disabled>${confirmLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = document.getElementById('code-input');
    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');

    input.addEventListener('input', () => {
      okBtn.disabled = input.value.trim().toUpperCase() !== code.toUpperCase();
      okBtn.style.opacity = okBtn.disabled ? '0.5' : '1';
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !okBtn.disabled) cleanup(true);
      if (e.key === 'Escape') cleanup(false);
    });

    input.focus();

    const cleanup = (result) => {
      overlay.style.animation = 'fadeOut 0.15s ease forwards';
      setTimeout(() => overlay.remove(), 150);
      resolve(result);
    };

    cancelBtn.addEventListener('click', () => cleanup(false));
    okBtn.addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
  });
}

/**
 * Show a toast notification
 * @param {string} message
 * @param {string} type - 'success' | 'error' | 'info' | 'warning'
 * @param {number} duration - ms (default 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
  const colors = {
    success: { bg: '#166534', border: '#22c55e', icon: '✓' },
    error:   { bg: '#991b1b', border: '#ef4444', icon: '✗' },
    info:    { bg: '#1e3a5f', border: '#3b82f6', icon: 'ℹ' },
    warning: { bg: '#78350f', border: '#f97316', icon: '⚠' },
  };
  const c = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    z-index: 99998;
    background: ${c.bg}; border: 1px solid ${c.border};
    color: #fff; padding: 12px 20px; border-radius: 10px;
    font-weight: 600; font-size: 0.9rem;
    box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    display: flex; align-items: center; gap: 10px;
    animation: slideUp 0.25s ease;
    max-width: 90vw;
  `;
  toast.innerHTML = `<span style="font-size:1.1rem;">${c.icon}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.2s ease forwards';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

/**
 * Show a loading overlay
 */
export function showLoader(message = "Loading...") {
  const existing = document.getElementById('loader-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'loader-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99997;
    background: rgba(0,0,0,0.6);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 16px;
    backdrop-filter: blur(4px);
  `;
  overlay.innerHTML = `
    <div style="
      width:48px; height:48px; border:4px solid #334155;
      border-top-color:#fbbf24; border-radius:50%;
      animation: spin 0.8s linear infinite;
    "></div>
    <p style="color:#94a3b8; font-size:0.9rem;">${message}</p>
  `;
  document.body.appendChild(overlay);
  return () => overlay.remove();
}

// Inject animation keyframes if not present
if (!document.getElementById('ui-helpers-styles')) {
  const style = document.createElement('style');
  style.id = 'ui-helpers-styles';
  style.textContent = `
    @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
    @keyframes fadeOut { from { opacity:1; } to { opacity:0; } }
    @keyframes slideUp  { from { opacity:0; transform:translate(-50%, 20px); } to { opacity:1; transform:translate(-50%, 0); } }
    @keyframes spin     { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
}
