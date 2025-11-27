// Soumission de chanson par un utilisateur logué (via localStorage)

async function submitSong(e) {
  e.preventDefault();
  const userId = localStorage.getItem('userId');
  const msg = document.getElementById('songMsg');
  if (!userId) { msg.textContent = 'Veuillez vous inscrire/identifier d\'abord (page Inscription).'; return; }
  const title = document.getElementById('title').value.trim();
  const artist = document.getElementById('artist').value.trim();
  const audioUrl = document.getElementById('audioUrl').value.trim();
  if (!title || !artist) { msg.textContent = 'Titre et artiste sont requis.'; return; }
  try {
    const res = await fetch('/api/submit-song', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, artist, audioUrl })
    });
    const data = await res.json();
    if (!res.ok) { msg.textContent = data.error || 'Erreur de soumission'; return; }
    msg.textContent = 'Chanson soumise avec succès !';
  } catch (err) {
    msg.textContent = 'Erreur réseau';
  }
}

document.getElementById('songForm').addEventListener('submit', submitSong);
