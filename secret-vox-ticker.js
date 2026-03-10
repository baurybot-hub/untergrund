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

    // Falls dein gespeicherter Mute-Status oft "Ticker kaputt" wirkt:
    // auf true setzen, wenn du Persistenz wieder streng willst.
    const RESTORE_MUTED_FROM_STORAGE = true;

    let isMuted = false;
    if (RESTORE_MUTED_FROM_STORAGE) {
      try {
        isMuted = localStorage.getItem('secretVoxMuted') === 'true';
      } catch (_) {
        isMuted = false;
      }
    }

    ensureFallbackStyles();

    root.innerHTML = `
      <div class="secret-vox-ticker ${isMuted ? 'secret-vox-ticker--muted' : ''}">
        <div class="secret-vox-track" aria-live="polite">
          <span class="secret-vox-segment">Secret VOX bootet …</span>
          <span class="secret-vox-segment" aria-hidden="true">Secret VOX bootet …</span>
        </div>
        <button class="secret-vox-mute-btn" type="button" aria-pressed="${isMuted ? 'true' : 'false'}">
          ${isMuted ? 'VOX aktivieren' : 'VOX stumm'}
        </button>
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

    function ensureFallbackStyles() {
      // Falls externes CSS fehlt, läuft der Ticker trotzdem.
      if (document.getElementById('secret-vox-ticker-fallback-style')) return;

      const style = document.createElement('style');
      style.id = 'secret-vox-ticker-fallback-style';
      style.textContent = `
        .secret-vox-ticker {
          display: flex;
          align-items: center;
          gap: .75rem;
          width: 100%;
          overflow: hidden;
          white-space: nowrap;
          font: 500 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        }
        .secret-vox-track {
          flex: 1;
          min-width: 0;
          display: inline-flex;
          animation: secret-vox-scroll 26s linear infinite;
          will-change: transform;
        }
        .secret-vox-segment {
          display: inline-block;
          padding-right: 3rem;
        }
        .secret-vox-mute-btn {
          border: 1px solid rgba(255,255,255,.25);
          background: transparent;
          color: inherit;
          border-radius: 999px;
          padding: .35rem .65rem;
          cursor: pointer;
          font: inherit;
          white-space: nowrap;
        }
        .secret-vox-ticker--muted .secret-vox-track {
          animation-play-state: paused;
          opacity: .75;
        }
        @keyframes secret-vox-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `;
      document.head.appendChild(style);
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
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} on ${path}`);
        }
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

        const nextLines = [
          `Secret VOX: ${formatInt(artistCount)} Artists wurden bisher im UnterGrund verzeichnet.`,
          `Secret VOX: ${formatInt(stageCount)} Artists haben bereits die Stage freigeschaltet.`,
          `Secret VOX: ${formatInt(gateCount)} Secret Gates treiben aktuell durch den UnterGrund.`
        ];

        if (top?.name) {
          nextLines.push(
            `Secret VOX: Highscore führt gerade ${top.name} mit ${formatInt(top.focus_score)} Focus.`
          );
        }
        if (second?.name) {
          nextLines.push(`Secret VOX: Verfolger‑Echo: ${second.name} liegt auf der Fährte zur Spitze.`);
        }

        nextLines.push('Secret VOX: Manche entdecken nach vier Pushes einen versteckten Boost…');
        nextLines.push('Secret VOX: Im Gate warten Hinweise, die nur Sammler wirklich lesen.');

        return shuffle(nextLines);
      } catch (err) {
        console.warn('[Secret VOX] Stats fallback:', err);
        return [...fallbackLines];
      }
    }

    function showLine(text) {
      const lineWithSpace = `${text}   •   `;
      trackSegments.forEach(seg => {
        seg.textContent = lineWithSpace;
      });
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
      }, 14000);
    }

    function setMuted(nextMuted) {
      isMuted = !!nextMuted;
      ticker.classList.toggle('secret-vox-ticker--muted', isMuted);
      muteBtn.textContent = isMuted ? 'VOX aktivieren' : 'VOX stumm';
      muteBtn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
      try {
        localStorage.setItem('secretVoxMuted', isMuted ? 'true' : 'false');
      } catch (_) {}
    }

    muteBtn.addEventListener('click', () => {
      setMuted(!isMuted);
    });

    (async () => {
      try {
        lines = await buildVoxLines();
        startRotation();

        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(async () => {
          lines = await buildVoxLines();
          idx = 0;
          if (!isMuted) showLine(lines[0] || fallbackLines[0]);
        }, 180000);

        console.info('[Secret VOX] Ticker gestartet.');
      } catch (err) {
        console.error('[Secret VOX] Init error:', err);
        lines = [...fallbackLines];
        startRotation();
      }
    })();
  });
})();
