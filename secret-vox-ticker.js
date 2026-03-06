document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('secret-vox-ticker-root');
  if (!root) return;

  const message =
    'Secret VOX: Im UnterGrund formt sich eine Stimme, die bald viele Nachrichten durch den Explorer flüstert.';

  const isMuted = localStorage.getItem('secretVoxMuted') === 'true';

  root.innerHTML = `
    <div class="secret-vox-ticker ${isMuted ? 'secret-vox-ticker--muted' : ''}">
      <div class="secret-vox-track">${message}</div>
      <button class="secret-vox-mute-btn" type="button">
        ${isMuted ? 'VOX wach' : 'VOX stumm'}
      </button>
    </div>
  `;

  const ticker = root.querySelector('.secret-vox-ticker');
  const muteBtn = root.querySelector('.secret-vox-mute-btn');

  muteBtn.addEventListener('click', () => {
    const currentlyMuted = ticker.classList.toggle('secret-vox-ticker--muted');
    localStorage.setItem('secretVoxMuted', currentlyMuted ? 'true' : 'false');
    muteBtn.textContent = currentlyMuted ? 'VOX wach' : 'VOX stumm';
  });
});
