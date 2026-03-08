document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('secret-vox-ticker-root');
  if (!root) return;

  const SUPABASE_URL = 'https://tyflhzwrwzfakwedipig.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_OkJhaPak_fd0nNg1vxRLPQ_gOiaI6Tb';

  const isMuted = localStorage.getItem('secretVoxMuted') === 'true';

  root.innerHTML = `
    <div class="secret-vox-ticker ${isMuted ? 'secret-vox-ticker--muted' : ''}">
      <div class="secret-vox-track">Secret VOX bootet …</div>
      <button class="secret-vox-mute-btn" type="button">
        ${isMuted ? 'VOX wach' : 'VOX stumm'}
      </button>
    </div>
  `;

  const ticker = root.querySelector('.secret-vox-ticker');
  const track = root.querySelector('.secret-vox-track');
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

      // kleine „Geheimnis“-Drops
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
  let timer = null;

  function showLine(text) {
    track.textContent = text;
  }

  function startRotation() {
    if (timer) clearInterval(timer);
    showLine(lines[0] || fallbackLines[0]);
    idx = 1;
    timer = setInterval(() => {
      showLine(lines[idx % lines.length]);
      idx += 1;
    }, 14000);
  }

  muteBtn.addEventListener('click', () => {
    const currentlyMuted = ticker.classList.toggle('secret-vox-ticker--muted');
    localStorage.setItem('secretVoxMuted', currentlyMuted ? 'true' : 'false');
    muteBtn.textContent = currentlyMuted ? 'VOX wach' : 'VOX stumm';
  });

  (async () => {
    lines = await buildVoxLines();
    startRotation();

    // alle 3 Minuten neue Stats ziehen
    setInterval(async () => {
      lines = await buildVoxLines();
      idx = 0;
      showLine(lines[0]);
      idx = 1;
    }, 180000);
  })();
});
