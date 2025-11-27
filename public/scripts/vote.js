// Interface de vote en temps réel
// L'admin lance une chanson, les users votent en 20 secondes

let allUsers = [];
let pollingInterval = null;
let countdownInterval = null;
let hasVoted = false;
let currentSessionId = null; // Pour traquer les différentes sessions

async function init() {
  const currentUserId = localStorage.getItem('userId');
  const currentFirstName = localStorage.getItem('firstName');
  
  if (!currentUserId || !currentFirstName) {
    alert('Veuillez vous inscrire d\'abord.');
    window.location.href = '/register.html';
    return;
  }
  
  // Charger les utilisateurs
  const usersRes = await fetch('/api/users');
  allUsers = await usersRes.json();
  
  // Afficher le nom de l'utilisateur
  showWelcomeMessage(currentFirstName);
  
  // Démarrer le polling pour détecter les sessions de vote
  startPolling();
}

function showWelcomeMessage(firstName) {
  const container = document.getElementById('voteContainer');
  container.innerHTML = '';
  
  const welcomeMsg = document.createElement('p');
  welcomeMsg.textContent = `Connecté en tant que: ${firstName}`;
  welcomeMsg.style.color = '#2563eb';
  welcomeMsg.style.fontWeight = 'bold';
  welcomeMsg.style.marginBottom = '24px';
  container.appendChild(welcomeMsg);
  
  const waitMsg = document.createElement('div');
  waitMsg.id = 'waitMsg';
  waitMsg.style.textAlign = 'center';
  waitMsg.style.padding = '48px 24px';
  waitMsg.style.color = '#6b7280';
  waitMsg.style.fontSize = '18px';
  waitMsg.innerHTML = '⏳ En attente du prochain vote...<br><small style="display: block; margin-top: 12px; font-size: 14px;">L\'admin va lancer une chanson bientôt</small>';
  container.appendChild(waitMsg);
}

function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  
  // Vérifier toutes les secondes s'il y a une session active
  pollingInterval = setInterval(checkActiveVote, 1000);
  checkActiveVote(); // Vérifier immédiatement
}

async function checkActiveVote() {
  try {
    const res = await fetch('/api/active-vote');
    const data = await res.json();
    
    if (data.active) {
      // Créer un identifiant unique pour cette session
      const sessionId = data.songId + '_' + data.startTime;
      
      // Si c'est une nouvelle session, réinitialiser hasVoted
      if (currentSessionId !== sessionId) {
        hasVoted = false;
        currentSessionId = sessionId;
      }
      
      if (!hasVoted) {
        // Il y a un vote actif, afficher l'interface
        displayVoteInterface(data);
      }
    } else if (!data.active && hasVoted) {
      // Le vote est terminé, réinitialiser
      hasVoted = false;
      currentSessionId = null;
      showWelcomeMessage(localStorage.getItem('firstName'));
    } else if (!data.active && !hasVoted) {
      // Pas de vote actif et pas voté, afficher le message d'attente
      if (!document.getElementById('waitMsg')) {
        showWelcomeMessage(localStorage.getItem('firstName'));
      }
    }
  } catch (err) {
    console.error('Erreur polling:', err);
  }
}

function displayVoteInterface(voteData) {
  const container = document.getElementById('voteContainer');
  const currentUserId = localStorage.getItem('userId');
  
  // Vérifier si l'interface est déjà affichée pour cette session
  const existingCard = document.getElementById('activeVoteCard');
  if (existingCard) {
    // Juste mettre à jour le countdown
    updateCountdown(voteData.remaining);
    return;
  }
  
  container.innerHTML = '';
  
  const welcomeMsg = document.createElement('p');
  welcomeMsg.textContent = `Connecté en tant que: ${localStorage.getItem('firstName')}`;
  welcomeMsg.style.color = '#2563eb';
  welcomeMsg.style.fontWeight = 'bold';
  welcomeMsg.style.marginBottom = '16px';
  container.appendChild(welcomeMsg);
  
  const card = document.createElement('div');
  card.className = 'card';
  card.id = 'activeVoteCard';
  card.dataset.sessionId = voteData.songId + '_' + voteData.startTime;
  
  const title = document.createElement('h2');
  title.textContent = `${voteData.song.title} — ${voteData.song.artist}`;
  title.style.marginBottom = '16px';
  
  // Lecteur audio
  const playerBox = document.createElement('div');
  playerBox.className = 'player';
  playerBox.style.marginBottom = '24px';
  
  if (voteData.song.audioUrl && voteData.song.audioUrl.endsWith('.mp3')) {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = voteData.song.audioUrl;
    audio.autoplay = true;
    playerBox.appendChild(audio);
  } else if (voteData.song.audioUrl) {
    const a = document.createElement('a');
    a.href = voteData.song.audioUrl;
    a.target = '_blank';
    a.textContent = 'Ouvrir le lien audio';
    a.style.fontSize = '16px';
    playerBox.appendChild(a);
  }
  
  // Countdown
  const countdown = document.createElement('div');
  countdown.id = 'countdown';
  countdown.style.fontSize = '32px';
  countdown.style.fontWeight = 'bold';
  countdown.style.textAlign = 'center';
  countdown.style.margin = '24px 0';
  countdown.style.color = '#dc2626';
  
  // Sélection
  const label = document.createElement('label');
  label.textContent = 'À qui appartient cette chanson ?';
  label.style.display = 'block';
  label.style.marginBottom = '8px';
  label.style.fontWeight = 'bold';
  
  const select = document.createElement('select');
  select.id = 'voteSelect';
  select.style.width = '100%';
  select.style.padding = '12px';
  select.style.fontSize = '16px';
  select.style.marginBottom = '16px';
  
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Sélectionner un prénom';
  select.appendChild(placeholder);
  
  allUsers.forEach(u => {
    if (u.id !== currentUserId) { // Ne pas afficher l'utilisateur actuel
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.firstName;
      select.appendChild(opt);
    }
  });
  
  // Bouton voter
  const voteBtn = document.createElement('button');
  voteBtn.textContent = 'Voter';
  voteBtn.style.width = '100%';
  voteBtn.style.fontSize = '18px';
  voteBtn.style.padding = '16px';
  voteBtn.addEventListener('click', () => submitVote(voteData.songId, select.value));
  
  const msg = document.createElement('p');
  msg.id = 'voteMsg';
  msg.className = 'small';
  msg.style.marginTop = '16px';
  msg.style.textAlign = 'center';
  
  card.appendChild(title);
  card.appendChild(playerBox);
  card.appendChild(countdown);
  card.appendChild(label);
  card.appendChild(select);
  card.appendChild(voteBtn);
  card.appendChild(msg);
  container.appendChild(card);
  
  // Démarrer le countdown
  startCountdown(voteData.remaining);
}

function startCountdown(remaining) {
  if (countdownInterval) clearInterval(countdownInterval);
  
  const update = () => {
    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) {
      clearInterval(countdownInterval);
      return;
    }
    
    const seconds = Math.ceil(remaining / 1000);
    
    if (seconds > 0) {
      countdownEl.textContent = `⏱️ ${seconds}s`;
      remaining -= 100;
    } else {
      countdownEl.textContent = '⏱️ Temps écoulé !';
      countdownEl.style.color = '#9ca3af';
      clearInterval(countdownInterval);
      
      // Désactiver l'interface
      const select = document.getElementById('voteSelect');
      const voteBtn = document.querySelector('#activeVoteCard button');
      if (select) select.disabled = true;
      if (voteBtn) voteBtn.disabled = true;
      
      const msg = document.getElementById('voteMsg');
      if (msg && !hasVoted) {
        msg.textContent = 'Temps écoulé ! Vous n\'avez pas voté.';
        msg.style.color = '#dc2626';
      }
      
      // Réinitialiser hasVoted et currentSessionId après 2 secondes pour le prochain vote
      setTimeout(() => {
        hasVoted = false;
        currentSessionId = null;
      }, 2000);
    }
  };
  
  update();
  countdownInterval = setInterval(update, 100);
}

function updateCountdown(remaining) {
  const countdownEl = document.getElementById('countdown');
  if (countdownEl) {
    const seconds = Math.ceil(remaining / 1000);
    if (seconds > 0) {
      countdownEl.textContent = `⏱️ ${seconds}s`;
    }
  }
}

async function submitVote(songId, guessedUserId) {
  const msg = document.getElementById('voteMsg');
  const select = document.getElementById('voteSelect');
  const voteBtn = document.querySelector('#activeVoteCard button');
  const currentUserId = localStorage.getItem('userId');
  
  msg.textContent = '';
  
  if (!guessedUserId) {
    msg.textContent = 'Veuillez choisir un prénom.';
    msg.style.color = '#dc2626';
    return;
  }
  
  voteBtn.classList.add('loading');
  voteBtn.disabled = true;
  
  try {
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterUserId: currentUserId, songId, guessedUserId })
    });
    const data = await res.json();
    
    if (!res.ok) {
      if (res.status === 404 && data.error.includes('introuvable')) {
        localStorage.removeItem('userId');
        localStorage.removeItem('firstName');
        alert('Votre session a expiré. Veuillez vous réinscrire.');
        window.location.href = '/register.html';
        return;
      }
      
      msg.textContent = data.error || 'Erreur de vote';
      msg.style.color = '#dc2626';
      voteBtn.classList.remove('loading');
      voteBtn.disabled = false;
      return;
    }
    
    // Vote réussi
    hasVoted = true;
    voteBtn.classList.remove('loading');
    select.disabled = true;
    
    // Trouver le propriétaire de la chanson
    const song = await (await fetch('/api/songs')).json();
    const currentSong = song.find(s => s.id === songId);
    const songOwner = allUsers.find(u => u.id === currentSong.userId);
    const ownerName = songOwner ? songOwner.firstName : 'Inconnu';
    
    if (data.vote.isCorrect) {
      voteBtn.style.backgroundColor = '#16a34a';
      voteBtn.textContent = `✓ C'est la chanson de ${ownerName}`;
      msg.textContent = '✅ Bravo ! Bonne réponse.';
      msg.style.color = '#16a34a';
    } else {
      voteBtn.style.backgroundColor = '#dc2626';
      voteBtn.textContent = `✗ C'est la chanson de ${ownerName}`;
      msg.textContent = '❌ Raté, ce n\'est pas la bonne personne.';
      msg.style.color = '#dc2626';
    }
    
    // Arrêter le countdown
    if (countdownInterval) clearInterval(countdownInterval);
    
  } catch (err) {
    msg.textContent = 'Erreur réseau';
    msg.style.color = '#dc2626';
    voteBtn.classList.remove('loading');
    voteBtn.disabled = false;
  }
}

// Nettoyer les intervals à la fermeture
window.addEventListener('beforeunload', () => {
  if (pollingInterval) clearInterval(pollingInterval);
  if (countdownInterval) clearInterval(countdownInterval);
});

init();
