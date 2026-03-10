(() => {
  'use strict';

  // Doppel-Init-Schutz (wenn Script versehentlich 2x eingebunden ist)
  if (window.__SVX2_TICKER_INITIALIZED__) return;
  window.__SVX2_TICKER_INITIALIZED__ = true;

  const SUPABASE_URL = 'https://tyflhzwrwzfakwedipig.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_OkJhaPak_fd0nNg1vxRLPQ_gOiaI6Tb';

  const PAUSE_KEY = 'svx2Paused';
  const LOOPS_PER_LINE = 2;
  const REFRESH_MS = 180000;

  const fallbackLines = [
    'Secret VOX: Im UnterGrund formt sich eine Stimme zwischen Fokus und Schatten.',
    'Secret VOX: Jede Stage beginnt mit einem einzigen Push.',
    'Secret VOX: Was heute unter dem Radar fliegt, kann morgen die Stage tragen.'
  ];

  function formatInt(n) {
    return new Intl.NumberFormat('de-DE').format(Number(n) || 0);
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async function fetchJson(path) {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 9000);

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        signal: ctrl.signal
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
      return await res.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function buildVoxLines() {
    try {
      const [topArtists, stageArtists, artistsCountRes, cardsCountRes] = await Promise.all([
        fetchJson('artists_public?select=name,focus_score&order=focus_score.desc.nullslast&limit=3'),
        fetchJson('artists_public?select=id&stage_unlocked=eq.true'),
        fetchJson('artists_public?select=id'),
        fetchJson('gate_cards_public?select=id')
      ]);

      const artistCount = Array.isArray(artistsCountRes) ? artistsCountRes.length : 0;
      const stageCount = Array.isArray(stageArtists) ? stageArtists.length : 0;
      const gateCount = Array.isArray(cardsCountRes) ? cardsCountRes.length : 0;

      const top = Array.isArray(topArtists) ? topArtists[0] : null;
      const second = Array.isArray(topArtists) ? topArtists[1] : null;

      const out = [
        `Secret VOX: ${formatInt(artistCount)} Artists wurden bisher im UnterGrund verzeichnet.`,
        `Secret VOX: ${formatInt(stageCount)} Artists haben bereits die Stage freigeschaltet.`,
        `Secret VOX: ${formatInt(gateCount)} Secret Gates treiben aktuell durch den UnterGrund.`
      ];

      if (top?.name) {
        out.push(`Secret VOX: Highscore führt gerade ${top.name} mit ${formatInt(top.focus_score)} Focus.`);
      }
      if (second?.name) {
        out.push(`Secret VOX: Verfolger‑Echo: ${second.name} liegt auf der Fährte zur Spitze.`);
      }

      out.push('Secret VOX: Manche entdecken nach vier Pushes einen versteckten Boost…');
      out.push('Secret VOX: Im Gate warten Hinweise, die nur Sammler wirklich lesen.');

      return shuffle(out);
    } catch (err) {
      console.warn('[SVX2] Fallback aktiv:', err);
      return [...fallbackLines];
    }
  }

  function initTicker() {
    const root = document.getElementById('secret-vox-ticker-root');
    if (!root) return;

    // Sicherheits-Cleanup: alten Inhalt + alte mögliche Button-Reste entfernen
    root.innerHTML = '';

    let isPaused = false;
    try {
      isPaused = localStorage.getItem(PAUSE_KEY) === 'true';
    } catch (_) {}

    root.innerHTML = `
      <div
        class="svx2-ticker ${isPaused ? 'svx2-ticker--paused' : ''}"
        role="button"
        tabindex="0"
        aria-label="Secret VOX Ticker pausieren oder fortsetzen"
        aria-pressed="${isPaused ? 'true' : 'false'}"
      >
        <div class="svx2-track">
          <span class="svx2-segment">Secret VOX bootet …</span>
          <span class="svx2-segment" aria-hidden="true">Secret VOX bootet …</span>
        </div>
      </div>
    `;

    const ticker = root.querySelector('.svx2-ticker');
    const track = root.querySelector('.svx2-track');
    const [segA, segB] = root.querySelectorAll('.svx2-segment');

    let lines = [...fallbackLines];
    let idx = 0;
    let loopsOnCurrentLine = 0;
    let pendingLines = null;

    function applyPause(next) {
      isPaused = !!next;
      ticker.classList.toggle('svx2-ticker--paused', isPaused);
      ticker.setAttribute('aria-pressed', isPaused ? 'true' : 'false');
      try {
        localStorage.setItem(PAUSE_KEY, isPaused ? 'true' : 'false');
      } catch (_) {}
    }

    function setLine(text) {
      const content = `${text}   •   `;
      segA.textContent = content;
      segB.textContent = content;

      // Konstante Geschwindigkeit für konsistente Wahrnehmung
      const speedPxPerSec = 80;
      const width = segA.scrollWidth || 600;
      const durationSec = Math.max(10, Math.min(40, width / speedPxPerSec));
      track.style.setProperty('--svx2-duration', `${durationSec.toFixed(2)}s`);
    }

    function nextLine() {
      if (!lines.length) lines = [...fallbackLines];
      const text = lines[idx % lines.length];
      idx++;
      setLine(text);
    }

    function togglePause() {
      applyPause(!isPaused);
    }

    track.addEventListener('animationiteration', () => {
      if (isPaused) return;

      loopsOnCurrentLine++;
      if (loopsOnCurrentLine >= LOOPS_PER_LINE) {
        loopsOnCurrentLine = 0;

        if (pendingLines) {
          lines = pendingLines;
          pendingLines = null;
          idx = 0;
        }

        nextLine();
      }
    });

    ticker.addEventListener('click', togglePause);
    ticker.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePause();
      }
    });

    (async () => {
      lines = await buildVoxLines();
      idx = 0;
      loopsOnCurrentLine = 0;
      nextLine();

      setInterval(async () => {
        pendingLines = await buildVoxLines();
      }, REFRESH_MS);
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTicker);
  } else {
    initTicker();
  }
})();
