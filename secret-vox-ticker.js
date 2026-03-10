(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('secret-vox-ticker-root');
    if (!root) return;

    const SUPABASE_URL = 'https://tyflhzwrwzfakwedipig.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_OkJhaPak_fd0nNg1vxRLPQ_gOiaI6Tb';

    let isMuted = false;
    try {
      isMuted = localStorage.getItem('secretVoxMuted') === 'true';
    } catch (_) {}

    root.innerHTML = `
      <div class="secret-vox-ticker ${isMuted ? 'secret-vox-ticker--muted' : ''}">
        <button class="secret-vox-mute-btn" type="button" aria-pressed="${isMuted ? 'true' : 'false'}">
          ${isMuted ? 'VOX aktivieren' : 'VOX stumm'}
        </button>

        <div class="secret-vox-viewport" aria-live="polite">
          <span class="secret-vox-line">Secret VOX bootet …</span>
        </div>
      </div>
    `;

    const ticker = root.querySelector('.secret-vox-ticker');
    const viewport = root.querySelector('.secret-vox-viewport');
    const lineEl = root.querySelector('.secret-vox-line');
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
    let refreshTimer = null;

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

    // Genau eine Nachricht läuft komplett durch, dann nächste.
    function runLine(text) {
      lineEl.classList.remove('secret-vox-line--run');
      lineEl.textContent = text;

      // Reflow erzwingen, damit Animation neu startet
      void lineEl.offsetWidth;

      const viewportWidth = viewport.clientWidth || 320;
      const lineWidth = lineEl.scrollWidth || 320;

      // Geschwindigkeit
      const speedPxPerSec = 120;
      const distance = viewportWidth + lineWidth;
      const durationSec = Math.max(5.5, Math.min(20, distance / speedPxPerSec));

      lineEl.style.setProperty('--vox-start', `${viewportWidth}px`);
      lineEl.style.setProperty('--vox-end', `${-lineWidth}px`);
      lineEl.style.setProperty('--vox-duration', `${durationSec.toFixed(2)}s`);

      lineEl.classList.add('secret-vox-line--run');
    }

    function playNext() {
      if (!lines.length) lines = [...fallbackLines];
      runLine(lines[idx % lines.length]);
      idx++;
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

    muteBtn.addEventListener('click', () => setMuted(!isMuted));

    lineEl.addEventListener('animationend', () => {
      if (!isMuted) playNext();
    });

    // Bei Resize aktuelle Nachricht neu berechnen (sauberer Lauf)
    let resizeRaf = null;
    window.addEventListener('resize', () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        if (!isMuted) runLine(lines[(idx - 1 + lines.length) % lines.length] || fallbackLines[0]);
      });
    });

    (async () => {
      lines = await buildVoxLines();
      idx = 0;
      playNext();

      refreshTimer = setInterval(async () => {
        lines = await buildVoxLines();
        idx = 0;
      }, 180000);
    })();
  });
})();
