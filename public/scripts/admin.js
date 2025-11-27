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
  const votesContainer = document.getElementById('votesContainer');
  if (!scoresBody || !votesContainer) return;
  scoresBody.innerHTML = '';
  votesContainer.innerHTML = '';

  // Afficher les scores
  data.scores.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.firstName}</td><td>${s.score}</td>`;
    scoresBody.appendChild(tr);
  });

  // Organiser les votes par chanson
  data.songs.forEach(song => {
    const songOwner = data.users.find(u => u.id === song.userId);
    const songVotes = data.votes.filter(v => v.songId === song.id);
    
    // Calculer combien d'utilisateurs ont voté pour cette chanson
    const totalUsers = data.users.length;
    const votedUsers = new Set(songVotes.map(v => v.voterUserId)).size;
    const allVoted = votedUsers === totalUsers;
    
    // Créer la section pour cette chanson
    const section = document.createElement('div');
    section.className = 'song-votes-section';
    section.style.marginBottom = '24px';
    section.style.border = '1px solid #e5e7eb';
    section.style.borderRadius = '8px';
    section.style.padding = '16px';
    
    // Titre de la chanson avec indicateur de participation
    const header = document.createElement('div');
    header.style.marginBottom = '12px';
    
    const songTitle = document.createElement('h4');
    songTitle.textContent = `${song.title} — ${song.artist}`;
    songTitle.style.margin = '0 0 8px 0';
    songTitle.style.color = '#1f2937';
    
    const participation = document.createElement('div');
    participation.style.fontSize = '14px';
    participation.style.fontWeight = 'bold';
    participation.style.padding = '4px 8px';
    participation.style.borderRadius = '4px';
    participation.style.display = 'inline-block';
    
    if (allVoted) {
      participation.textContent = `✅ Tous les utilisateurs ont voté (${votedUsers}/${totalUsers})`;
      participation.style.backgroundColor = '#dcfce7';
      participation.style.color = '#166534';
    } else {
      participation.textContent = `⏳ ${votedUsers}/${totalUsers} utilisateurs ont voté`;
      participation.style.backgroundColor = '#fef3c7';
      participation.style.color = '#92400e';
    }
    
    const ownerInfo = document.createElement('div');
    ownerInfo.style.fontSize = '13px';
    ownerInfo.style.color = '#6b7280';
    ownerInfo.style.marginTop = '4px';
    ownerInfo.textContent = `Chanson de: ${songOwner ? songOwner.firstName : '—'}`;
    
    header.appendChild(songTitle);
    header.appendChild(participation);
    header.appendChild(ownerInfo);
    
    // Tableau des votes pour cette chanson
    const table = document.createElement('table');
    table.className = 'table';
    table.style.marginTop = '12px';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Votant</th>
          <th>A deviné</th>
          <th>Correct</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    
    const tbody = table.querySelector('tbody');
    
    if (songVotes.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="3" style="text-align: center; color: #9ca3af;">Aucun vote pour cette chanson</td>`;
      tbody.appendChild(tr);
    } else {
      songVotes.forEach(v => {
        const voter = data.users.find(u => u.id === v.voterUserId);
        const guessed = data.users.find(u => u.id === v.guessedUserId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${voter ? voter.firstName : '—'}</td>
          <td>${guessed ? guessed.firstName : '—'}</td>
          <td style="color: ${v.isCorrect ? '#16a34a' : '#dc2626'}; font-weight: bold;">
            ${v.isCorrect ? '✓ Oui' : '✗ Non'}
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
    
    section.appendChild(header);
    section.appendChild(table);
    votesContainer.appendChild(section);
  });
  
  if (data.songs.length === 0) {
    votesContainer.innerHTML = '<p style="color: #9ca3af; text-align: center;">Aucune chanson soumise</p>';
  }
}

document.getElementById('resetBtn').addEventListener('click', resetAll);
const refreshBtn = document.getElementById('refreshResultsBtn');
if (refreshBtn) refreshBtn.addEventListener('click', loadResults);
loadSongs();
loadResults();
