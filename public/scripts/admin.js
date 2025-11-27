// Interface administrateur: voir chansons, jouer lien/MP3, reset, et résultats

async function loadSongs() {
  const [usersRes, songsRes] = await Promise.all([
    fetch('/api/users'),
    fetch('/api/songs')
  ]);
  const users = await usersRes.json();
  const songs = await songsRes.json();

  const box = document.getElementById('songsList');
  box.innerHTML = '';

  songs.forEach(s => {
    const owner = users.find(u => u.id === s.userId);
    const item = document.createElement('div');
    item.className = 'list-item';
    const title = document.createElement('div');
    title.textContent = `${s.title} — ${s.artist} (par ${owner ? owner.firstName : '—'})`;

    const player = document.createElement('div');
    player.className = 'player';
    if (s.audioUrl && s.audioUrl.endsWith('.mp3')) {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = s.audioUrl;
      player.appendChild(audio);
    } else if (s.audioUrl) {
      const a = document.createElement('a');
      a.href = s.audioUrl;
      a.target = '_blank';
      a.textContent = 'Ouvrir le lien audio';
      player.appendChild(a);
    } else {
      const small = document.createElement('div');
      small.className = 'small';
      small.textContent = 'Pas de lien audio';
      player.appendChild(small);
    }

    item.appendChild(title);
    item.appendChild(player);
    box.appendChild(item);
  });
}

async function resetAll() {
  const msg = document.getElementById('adminMsg');
  msg.textContent = '';
  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { msg.textContent = data.error || 'Erreur reset'; return; }
    msg.textContent = 'Réinitialisation effectuée.';
    await loadSongs();
  } catch (err) {
    msg.textContent = 'Erreur réseau';
  }
}

async function loadResults() {
  const res = await fetch('/api/results');
  const data = await res.json();
  const scoresBody = document.querySelector('#scoresTableAdmin tbody');
  const votesBody = document.querySelector('#votesTableAdmin tbody');
  if (!scoresBody || !votesBody) return;
  scoresBody.innerHTML = '';
  votesBody.innerHTML = '';

  data.scores.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.firstName}</td><td>${s.score}</td>`;
    scoresBody.appendChild(tr);
  });

  data.votes.forEach(v => {
    const voter = data.users.find(u => u.id === v.voterUserId);
    const song = data.songs.find(s => s.id === v.songId);
    const guessed = data.users.find(u => u.id === v.guessedUserId);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${voter ? voter.firstName : '—'}</td>
                    <td>${song ? `${song.title} — ${song.artist}` : '—'}</td>
                    <td>${guessed ? guessed.firstName : '—'}</td>
                    <td>${v.isCorrect ? 'Oui' : 'Non'}</td>`;
    votesBody.appendChild(tr);
  });
}

document.getElementById('resetBtn').addEventListener('click', resetAll);
const refreshBtn = document.getElementById('refreshResultsBtn');
if (refreshBtn) refreshBtn.addEventListener('click', loadResults);
loadSongs();
loadResults();
