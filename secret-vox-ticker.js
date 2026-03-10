document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('secret-vox-ticker-root');
  if (!root) return;

  const SUPABASE_URL = 'https://tyflhzwrwzfakwedipig.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_OkJhaPak_fd0nNg1vxRLPQ_gOiaI6Tb';
  const ANIMATION_DURATION_MS = 10000;

  let isMuted = localStorage.getItem('secretVoxMuted') === 'true';

  root.innerHTML = `
    <style>
      .secret-vox-ticker {
        width: 100%;
        max-width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.35rem 1rem;
        background: #050505;
        color: #f5f5f5;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.95rem;
        border-radius: 999px;
        box-shadow: 0 0 28px rgba(0, 0, 0, 0.35);
        overflow: hidden;
      }

      .secret-vox-track {
        flex: 1;
        min-height: 1.5em;
        position: relative;
        overflow: hidden;
      }

      .secret-vox-marquee {
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        white-space: nowrap;
        will-change: transform;
        animation-name: secret-vox-marquee;
        animation-duration: var(--secret-vox-duration, 10s);
        animation-timing-function: linear;
        animation-fill-mode: forwards;
        animation-iteration-count: 1;
        padding-right: 2rem;
      }

      .secret-vox-marquee.is-animating {
        animation-play-state: running;
      }

      .secret-vox-ticker--muted .secret-vox-marquee {
        animation-play-state: paused;
      }

      .secret-vox-mute-btn {
        border: none;
        background: #1a1a1a;
        color: #f5f5f5;
        padding: 0.45rem 0.9rem;
        border-radius: 999px;
        cursor: pointer;
        font: inherit;
        transition: background 0.2s ease;
      }

      .secret-vox-mute-btn:hover {
        background: #303030;
      }

      @keyframes secret-vox-marquee {
        0% {
          transform: translate(100%, -50%);
        }
        100% {
          transform: translate(-100%, -50%);
        }
      }
    </style>
    <div class="secret-vox-ticker ${isMuted ? 'secret-vox-ticker--muted' : ''}">
      <div class="secret-vox-track">
        <span class="secret-vox-marquee is-animating" aria-live="polite" role="status">Secret VOX bootet …</span>
      </div>
      <button class="secret-vox-mute-btn" type="button">
        ${isMuted ? 'VOX wach' : 'VOX stumm'}
      </button>
    </div>
  `;

  const ticker = root.querySelector('.secret-vox-ticker');
  const marquee = root.querySelector('.secret-vox-marquee');
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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  }

  async function buildVoxLines() {
    try {
      const [topArtists, stageArtists, artistsCountRes, cardsCountRes] = await Promise.all([
        fetchJson('artists_public?select=name,focus_score&order=focus_score.desc&limit=3'),
        fetchJson('artists_public?select=id&stage_unlocked=eq.true'),
        fetchJson('artists_public?select=id'),
        fetchJson('gate_cards_public?select=id')
      ]);

      const artistCount = artistsCountRes.length;
      const stageCount = stageArtists.length;
      const gateCount = cardsCountRes.length;

      const top = topArtists[0];
      const second = topArtists[1];

      const lines = [
        `Secret VOX: ${formatInt(artistCount)} Artists wurden bisher im UnterGrund verzeichnet.`,
        `Secret VOX: ${formatInt(stageCount)} Artists haben bereits die Stage freigeschaltet.`,
        `Secret VOX: ${formatInt(gateCount)} Secret Gates treiben aktuell durch den UnterGrund.`
      ];

      if (top?.name) {
        lines.push(`Secret VOX: Highscore führt gerade ${top.name} mit ${formatInt(top.focus_score)} Focus.`);
      }
      if (second?.name) {
        lines.push(`Secret VOX: Verfolger‑Echo: ${second.name} liegt auf der Fährte zur Spitze.`);
      }

      lines.push('Secret VOX: Manche entdecken nach vier Pushes einen versteckten Boost…');
      lines.push('Secret VOX: Im Gate warten Hinweise, die nur Sammler wirklich lesen.');

      return shuffle(lines);
    } catch (err) {
      console.warn('Secret VOX Stats fallback:', err);
      return fallbackLines;
    }
  }

  let lines = fallbackLines;
  let idx = 0;
  let rotationTimer = null;

  function showLine(text) {
    marquee.classList.remove('is-animating');
    marquee.style.setProperty('--secret-vox-duration', `${ANIMATION_DURATION_MS}ms`);
    marquee.textContent = text;
    void marquee.offsetWidth;
    marquee.classList.add('is-animating');

    clearTimeout(rotationTimer);
    rotationTimer = setTimeout(() => {
      rotationTimer = null;
      if (!isMuted) {
        showLine(lines[idx]);
        idx = (idx + 1) % lines.length;
      }
    }, ANIMATION_DURATION_MS + 600);
  }

  function startRotation() {
    clearTimeout(rotationTimer);
    rotationTimer = null;
    idx = 0;
    if (!isMuted) {
      showLine(lines[idx]);
      idx = (idx + 1) % lines.length;
    }
  }

  muteBtn.addEventListener('click', () => {
    isMuted = ticker.classList.toggle('secret-vox-ticker--muted');
    localStorage.setItem('secretVoxMuted', isMuted ? 'true' : 'false');
    muteBtn.textContent = isMuted ? 'VOX wach' : 'VOX stumm';

    if (isMuted) {
      clearTimeout(rotationTimer);
      rotationTimer = null;
      marquee.classList.remove('is-animating');
    } else {
      showLine(lines[idx]);
      idx = (idx + 1) % lines.length;
    }
  });

  (async () => {
    lines = await buildVoxLines();
    startRotation();

    rotationTimer = setInterval(async () => {
      lines = await buildVoxLines();
      startRotation();
    }, 180000);
  })();
});
