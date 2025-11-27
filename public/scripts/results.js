// Affichage des scores et des votes détaillés

async function loadResults() {
  const res = await fetch('/api/results');
  const data = await res.json();
  const scoresBody = document.querySelector('#scoresTable tbody');
  const votesBody = document.querySelector('#votesTable tbody');
  scoresBody.innerHTML = '';
  votesBody.innerHTML = '';

  data.scores.forEach(s => {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.textContent = s.firstName;
    const tdScore = document.createElement('td');
    tdScore.textContent = s.score;
    tr.appendChild(tdName); tr.appendChild(tdScore);
    scoresBody.appendChild(tr);
  });

  // Détails des votes
  data.votes.forEach(v => {
    const tr = document.createElement('tr');
    const voter = data.users.find(u => u.id === v.voterUserId);
    const song = data.songs.find(s => s.id === v.songId);
    const guessed = data.users.find(u => u.id === v.guessedUserId);

    const tdVoter = document.createElement('td');
    tdVoter.textContent = voter ? voter.firstName : '—';
    const tdSong = document.createElement('td');
    tdSong.textContent = song ? `${song.title} — ${song.artist}` : '—';
    const tdChoice = document.createElement('td');
    tdChoice.textContent = guessed ? guessed.firstName : '—';
    const tdCorrect = document.createElement('td');
    tdCorrect.textContent = v.isCorrect ? 'Oui' : 'Non';

    tr.appendChild(tdVoter);
    tr.appendChild(tdSong);
    tr.appendChild(tdChoice);
    tr.appendChild(tdCorrect);
    votesBody.appendChild(tr);
  });
}

loadResults();
