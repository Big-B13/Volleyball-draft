// Injects a floating back button on any page that imports this module.
// Uses browser history if there IS one, otherwise falls back to a sensible default.

const FALLBACK_TARGETS = {
  'setup.html':         './index.html',
  'admin.html':         './index.html',
  'league-editor.html': './admin.html',
  'photos.html':        './index.html',
  'cards.html':         './index.html',
  'league.html':        './index.html',
  'clubs.html':         './index.html',
  'login.html':         './index.html',
  'bootstrap.html':     './index.html',
  'predictions.html':          './index.html',
  'predictions-results.html':  './index.html',
  'standings.html':            './index.html',
  'player-stats.html':         './index.html',
  'player.html':               './cards.html',
  // clubs/*.html
  'strigidae.html':     '../clubs.html',
  'otters.html':        '../clubs.html',
  'shizuka.html':       '../clubs.html'
};

function inject() {
  if (document.getElementById('global-back-btn')) return;
  const page = location.pathname.split('/').pop() || 'index.html';
  // Don't show on the home page itself
  if (page === 'index.html' || page === '') return;

  const btn = document.createElement('a');
  btn.id = 'global-back-btn';
  btn.className = 'back-btn';
  btn.innerHTML = '<span aria-hidden="true">←</span> <span>Back</span>';
  btn.href = FALLBACK_TARGETS[page] || './index.html';

  btn.addEventListener('click', (e) => {
    // If we have real history (came from another page in this site), go back
    if (window.history.length > 1 && document.referrer && document.referrer.includes(location.host)) {
      e.preventDefault();
      history.back();
    }
    // Otherwise the href fallback handles it (normal link navigation)
  });

  document.body.appendChild(btn);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inject);
} else {
  inject();
}
