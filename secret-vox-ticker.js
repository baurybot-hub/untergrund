document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('secret-vox-ticker-root');
  if (!root) return;

  const SUPABASE_URL = 'https://tyflhzwrwzfakwedipig.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_OkJhaPak_fd0nNg1vxRLPQ_gOiaI6Tb';

  let isMuted = localStorage.getItem('secretVoxMuted') === 'true';

  // HTML mit ZWEI Segmenten für Endlos-Effekt
  root.innerHTML = `
    <div class="secret-vox-ticker ${isMuted ? 'secret-vox-ticker--muted' : ''}">
      <div class="secret-vox-track">
        <span class="secret-vox-segment">Secret VOX bootet …</span>
        <span class="secret-vox-segment" aria-hidden="true">Secret VOX bootet …</span>
      </div>
      <button class="secret-vox-mute-btn" type="button">
        ${isMuted ? 'VOX wach' : 'VOX stumm'}
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
  let refreshTimer = null;

  function showLine(text) {
    const lineWithSpace = text + '   •   ';
    trackSegments.forEach(seg => {
      seg.textContent = lineWithSpace;
    });
  }

  function startRotation() {
    if (rotationTimer) clearInterval(rotationTimer);
    
    // Zeige erste Zeile
    showLine(lines[0] || fallbackLines[0]);
    idx = 1;
    
    // Alle 14 Sekunden neue Zeile (passt zur CSS-Animation von 26s)
    rotationTimer = setInterval(() => {
      if (!isMuted) {
        showLine(lines[idx % lines.length]);
        idx++;
      }
    }, 14000);
  }

  // Mute-Button
  muteBtn.addEventListener('click', () => {
    isMuted = ticker.classList.toggle('secret-vox-ticker--muted');
    localStorage.setItem('secretVoxMuted', isMuted ? 'true' : 'false');
    muteBtn.textContent = isMuted ? 'VOX wach' : 'VOX stumm';
  });

  // Initialisieren
  (async () => {
    try {
      lines = await buildVoxLines();
      startRotation();

      // Alle 3 Minuten neue Stats
      refreshTimer = setInterval(async () => {
        lines = await buildVoxLines();
        idx = 0;
      }, 180000);
    } catch (err) {
      console.error('Secret VOX init error:', err);
    }
  })();
});
