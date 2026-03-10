(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('secret-vox-ticker-root');
    if (!root) return;

    const SUPABASE_URL = 'https://tyflhzwrwzfakwedipig.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_OkJhaPak_fd0nNg1vxRLPQ_gOiaI6Tb';

    // true = pausiert
    let isPaused = false;
    try {
      isPaused = localStorage.getItem('secretVoxPaused') === 'true';
    } catch (_) {}

    root.innerHTML = `
      <div
        class="secret-vox-ticker ${isPaused ? 'secret-vox-ticker--paused' : ''}"
        role="button"
        tabindex="0"
        aria-label="Secret VOX Ticker pausieren oder fortsetzen"
        aria-pressed="${isPaused ? 'true' : 'false'}"
        title="Klicken zum Pausieren/Fortsetzen"
      >
        <div class="secret-vox-track">
          <span class="secret-vox-segment">Secret VOX bootet …</span>
          <span class="secret-vox-segment" aria-hidden="true">Secret VOX bootet …</span>
        </div>
      </div>
    `;

    const ticker = root.querySelector('.secret-vox-ticker');
    const track = root.querySelector('.secret-vox-track');
    const [segA, segB] = root.querySelectorAll('.secret-vox-segment');

    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    };

    const fallbackLines = [
      'Secret VOX: Im UnterGrund formt sich eine Stimme zwischen Fokus und Schatten.',
      'Secret VOX: Jede Stage beginnt mit einem einzigen Push.',
      'Secret VOX: Was heute unter dem Radar fliegt, kann morgen die Stage tragen.'
    ];

    let lines = [...fallbackLines];
    let idx = 0;
    let loopsOnCurrentLine = 0;
    const LOOPS_PER_LINE = 2; // Nachricht läuft 2 komplette Zyklen, dann nächste
    let pendingLines = null;

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
          headers,
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
        console.warn('[Secret VOX] Stats fallback:', err);
        return [...fallbackLines];
      }
    }

    function setLine(text) {
      const t = `${text}   •   `;
      segA.textContent = t;
      segB.textContent = t;

      // konstante px/s statt fixer Dauer -> ruhiger bei langen/kurzen Texten
      const speedPxPerSec = 80;
      const w = segA.scrollWidth || 600;
      const duration = Math.max(10, Math.min(40, w / speedPxPerSec));
      track.style.setProperty('--vox-duration', `${duration.toFixed(2)}s`);
    }

    function applyPauseState(nextPaused) {
      isPaused = !!nextPaused;
      ticker.classList.toggle('secret-vox-ticker--paused', isPaused);
      ticker.setAttribute('aria-pressed', isPaused ? 'true' : 'false');
      try {
        localStorage.setItem('secretVoxPaused', isPaused ? 'true' : 'false');
      } catch (_) {}
    }

    function nextLine() {
      if (!lines.length) lines = [...fallbackLines];
      const text = lines[idx % lines.length];
      idx++;
      setLine(text);
    }

    // Beim nahtlosen Loop-Ende entscheiden, ob nächste Nachricht kommt
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

    function togglePause() {
      applyPauseState(!isPaused);
    }

    ticker.addEventListener('click', togglePause);
    ticker.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePause();
      }
    });

    // Init
    (async () => {
      lines = await buildVoxLines();
      idx = 0;
      loopsOnCurrentLine = 0;
      nextLine();

      // Stats im Hintergrund aktualisieren; sichtbar erst am Zyklus-Übergang
      setInterval(async () => {
        pendingLines = await buildVoxLines();
      }, 180000);
    })();
  });
})();
