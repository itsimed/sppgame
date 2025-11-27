// Interface administrateur: voir chansons, jouer lien/MP3, reset, et résultats

let currentVoteSession = null;
let countdownInterval = null;

async function loadSongs() {
  const [usersRes, songsRes] = await Promise.all([
    fetch('/api/users'),
    fetch('/api/songs')
  ]);
  const users = await usersRes.json();
  const songs = await songsRes.json();

  const box = document.getElementById('songsList');
  box.innerHTML = '';

  if (songs.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'small';
    emptyMsg.textContent = 'Aucune chanson soumise';
    box.appendChild(emptyMsg);
    return;
  }

  songs.forEach(s => {
    const owner = users.find(u => u.id === s.userId);
    const item = document.createElement('div');
    item.className = 'list-item';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.gap = '16px';
    
    // Ajouter un style différent si déjà jouée
    if (s.played) {
      item.style.backgroundColor = '#f3f4f6';
      item.style.opacity = '0.7';
    }
    
    const infoDiv = document.createElement('div');
    infoDiv.style.flex = '1';
    
    const title = document.createElement('div');
    const playedBadge = s.played ? ' ✓ Jouée' : '';
    title.textContent = `${s.title} — ${s.artist} (par ${owner ? owner.firstName : '—'})${playedBadge}`;
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '8px';
    
    if (s.played) {
      title.style.color = '#6b7280';
    }

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

    infoDiv.appendChild(title);
    infoDiv.appendChild(player);

    // Bouton pour lancer le vote
    const voteBtn = document.createElement('button');
    voteBtn.textContent = s.played ? '▶ Rejouer' : '▶ Lancer le vote';
    voteBtn.style.backgroundColor = s.played ? '#6b7280' : '#2563eb';
    voteBtn.style.whiteSpace = 'nowrap';
    voteBtn.addEventListener('click', () => startVote(s.id));

    item.appendChild(infoDiv);
    item.appendChild(voteBtn);
    box.appendChild(item);
  });
}

async function resetAll() {
  const msg = document.getElementById('adminMsg');
  const btn = document.getElementById('resetBtn');
  msg.textContent = '';
  
  btn.classList.add('loading');
  btn.disabled = true;
  
  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { 
      msg.textContent = data.error || 'Erreur reset';
      btn.classList.remove('loading');
      btn.disabled = false;
      return; 
    }
    msg.textContent = 'Réinitialisation effectuée.';
    await loadSongs();
    await loadResults();
    btn.classList.remove('loading');
    btn.disabled = false;
  } catch (err) {
    msg.textContent = 'Erreur réseau';
    btn.classList.remove('loading');
    btn.disabled = false;
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
if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;
    await loadResults();
    refreshBtn.classList.remove('loading');
    refreshBtn.disabled = false;
  });
}

// Gestion du vote en temps réel
async function startVote(songId) {
  const msg = document.getElementById('adminMsg');
  msg.textContent = '';
  
  try {
    const res = await fetch('/api/start-vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId })
    });
    const data = await res.json();
    
    if (!res.ok) {
      msg.textContent = data.error || 'Erreur';
      msg.style.color = '#dc2626';
      return;
    }
    
    msg.textContent = '✅ Vote lancé ! Les utilisateurs ont 20 secondes pour voter.';
    msg.style.color = '#16a34a';
    
    currentVoteSession = data.session;
    startCountdown();
    
  } catch (err) {
    msg.textContent = 'Erreur réseau';
    msg.style.color = '#dc2626';
  }
}

function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  
  const msg = document.getElementById('adminMsg');
  const updateCountdown = () => {
    if (!currentVoteSession) return;
    
    const elapsed = Date.now() - currentVoteSession.startTime;
    const remaining = Math.max(0, currentVoteSession.duration - elapsed);
    const seconds = Math.ceil(remaining / 1000);
    
    if (seconds > 0) {
      msg.textContent = `⏱️ Vote en cours... ${seconds}s restantes`;
      msg.style.color = '#2563eb';
    } else {
      msg.textContent = '✅ Vote terminé !';
      msg.style.color = '#16a34a';
      clearInterval(countdownInterval);
      currentVoteSession = null;
      loadResults(); // Rafraîchir les résultats
    }
  };
  
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 100);
}

async function stopVote() {
  try {
    await fetch('/api/stop-vote', { method: 'POST' });
    const msg = document.getElementById('adminMsg');
    msg.textContent = '🛑 Vote arrêté';
    msg.style.color = '#dc2626';
    
    if (countdownInterval) clearInterval(countdownInterval);
    currentVoteSession = null;
    
  } catch (err) {
    console.error('Erreur stop-vote:', err);
  }
}

loadSongs();
loadResults();
