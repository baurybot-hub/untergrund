// secret-vox-ticker.js
(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('secret-vox-ticker-root');
    if (!root) {
      console.warn('[Secret VOX] #secret-vox-ticker-root nicht gefunden.');
      return;
    }

    const SUPABASE_URL = 'https://tyflhzwrwzfakwedipig.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_OkJhaPak_fd0nNg1vxRLPQ_gOiaI6Tb';

    // Geschwindigkeit
    const SCROLL_DURATION = 16; // Sekunden (kleiner = schneller)
    const ROTATE_EVERY_MS = 8000; // neue Zeile alle 8s
    const REFRESH_STATS_MS = 180000; // 3 Minuten

    let isMuted = false;
    try {
      isMuted = localStorage.getItem('secretVoxMuted') === 'true';
    } catch (_) {}

    injectStyles(SCROLL_DURATION);

    root.innerHTML = `
      <div class="secret-vox-ticker ${isMuted ? 'secret-vox-ticker--muted' : ''}">
        <button class="secret-vox-mute-btn" type="button" aria-pressed="${isMuted ? 'true' : 'false'}">
          ${isMuted ? 'VOX aktivieren' : 'VOX stumm'}
        </button>

        <div class="secret-vox-viewport">
          <div class="secret-vox-track" aria-live="polite">
            <span class="secret-vox-segment">Secret VOX bootet …</span>
            <span class="secret-vox-segment" aria-hidden="true">Secret VOX bootet …</span>
          </div>
        </div>
      </div>
    `;

    const ticker = root.querySelector('.secret-vox-ticker');
    const trackSegments = root.querySelectorAll('.secret-vox-segment');
    const muteBtn = root.querySelector('.secret-vox-mute-btn');

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
    let rotationTimer = null;
    let refreshTimer = null;

    function injectStyles(durationSec) {
      const id = 'secret-vox-ticker-style';
      let style = document.getElementById(id);

      const css = `
        #secret-vox-ticker-root,
        #secret-vox-ticker-root * {
          box-sizing: border-box;
        }

        .secret-vox-ticker {
          width: 100%;
          max-width: 100%;
          display: grid;
          grid-template-columns: auto 1fr; /* Button links, Ticker rechts */
          align-items: center;
          gap: .65rem;
          padding: 0 .75rem; /* hält alles im sichtbaren Bereich */
          font: 500 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        }

        .secret-vox-mute-btn {
          justify-self: start;
          white-space: nowrap;
          border: 1px solid rgba(255,255,255,.28);
          background: transparent;
          color: inherit;
          border-radius: 999px;
          padding: .35rem .65rem;
          cursor: pointer;
          font: inherit;
        }

        .secret-vox-viewport {
          min-width: 0;
          overflow: hidden;   /* nur Text wird geclippt */
          white-space: nowrap;
        }

        .secret-vox-track {
          display: inline-flex;
          min-width: max-content;
          will-change: transform;
          animation: secret-vox-scroll ${durationSec}s linear infinite;
        }

        .secret-vox-segment {
          display: inline-block;
          padding-right: 3rem;
        }

        .secret-vox-ticker--muted .secret-vox-track {
          animation-play-state: paused;
          opacity: .78;
        }

        @keyframes secret-vox-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `;

      if (!style) {
        style = document.createElement('style');
        style.id = id;
        style.textContent = css;
        document.head.appendChild(style);
      } else {
        style.textContent = css;
      }
    }

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

    function showLine(text) {
      const t = `${text}   •   `;
      trackSegments.forEach(seg => (seg.textContent = t));
    }

    function startRotation() {
      if (rotationTimer) clearInterval(rotationTimer);

      showLine(lines[0] || fallbackLines[0]);
      idx = 1;

      rotationTimer = setInterval(() => {
        if (!isMuted) {
          showLine(lines[idx % lines.length]);
          idx++;
        }
      }, ROTATE_EVERY_MS);
    }

    function setMuted(next) {
      isMuted = !!next;
      ticker.classList.toggle('secret-vox-ticker--muted', isMuted);
      muteBtn.textContent = isMuted ? 'VOX aktivieren' : 'VOX stumm';
      muteBtn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');

      try {
        localStorage.setItem('secretVoxMuted', isMuted ? 'true' : 'false');
      } catch (_) {}
    }

    muteBtn.addEventListener('click', () => setMuted(!isMuted));

    (async () => {
      try {
        lines = await buildVoxLines();
      } catch (_) {
        lines = [...fallbackLines];
      }

      startRotation();

      if (refreshTimer) clearInterval(refreshTimer);
      refreshTimer = setInterval(async () => {
        lines = await buildVoxLines();
        idx = 0;
        if (!isMuted) showLine(lines[0] || fallbackLines[0]);
      }, REFRESH_STATS_MS);

      console.info('[Secret VOX] gestartet.');
    })();
  });
})();
