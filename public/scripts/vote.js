// Interface de vote
// Les joueurs voient les chansons et la liste des prénoms, et choisissent

async function loadData() {
  const currentUserId = localStorage.getItem('userId');
  
  // Vérifier que l'utilisateur existe en base avant d'afficher le vote
  if (currentUserId) {
    const usersRes = await fetch('/api/users');
    const users = await usersRes.json();
    const userExists = users.find(u => u.id === currentUserId);
    
    if (!userExists) {
      // L'utilisateur n'existe plus en base (cold start Vercel), on réinitialise
      localStorage.removeItem('userId');
      localStorage.removeItem('firstName');
      alert('Votre session a expiré. Veuillez vous réinscrire.');
      window.location.href = '/register.html';
      return;
    }
  }
  
  const [usersRes, songsRes] = await Promise.all([
    fetch('/api/users'),
    fetch('/api/songs')
  ]);
  const users = await usersRes.json();
  const songs = await songsRes.json();
  renderVoting(users, songs);
}

function renderVoting(users, songs) {
  const container = document.getElementById('voteContainer');
  container.innerHTML = '';
  const currentUserId = localStorage.getItem('userId');
  const currentFirstName = localStorage.getItem('firstName');

  // Afficher le nom de l'utilisateur connecté
  if (currentFirstName) {
    const welcomeMsg = document.createElement('p');
    welcomeMsg.textContent = `Connecté en tant que: ${currentFirstName}`;
    welcomeMsg.style.color = '#2563eb';
    welcomeMsg.style.fontWeight = 'bold';
    welcomeMsg.style.marginBottom = '16px';
    container.appendChild(welcomeMsg);
  }

  if (songs.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.textContent = 'Aucune chanson soumise pour le moment.';
    emptyMsg.className = 'small';
    container.appendChild(emptyMsg);
    return;
  }

  songs.forEach(song => {
    const card = document.createElement('div');
    card.className = 'card';
    const title = document.createElement('h3');
    title.textContent = `${song.title} — ${song.artist}`;

    // Lecteur audio simple si URL MP3, sinon afficher lien
    const playerBox = document.createElement('div');
    playerBox.className = 'player';
    if (song.audioUrl && song.audioUrl.endsWith('.mp3')) {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = song.audioUrl;
      playerBox.appendChild(audio);
    } else if (song.audioUrl) {
      const a = document.createElement('a');
      a.href = song.audioUrl;
      a.target = '_blank';
      a.textContent = 'Ouvrir le lien audio';
      playerBox.appendChild(a);
    }

    const label = document.createElement('label');
    label.textContent = 'À qui appartient cette chanson ?';
    const select = document.createElement('select');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Sélectionner un prénom';
    select.appendChild(placeholder);

    users.forEach(u => {
      // Optionnel: ne pas lister le votant lui-même (mais on interdit via serveur de toute façon)
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.firstName;
      select.appendChild(opt);
    });

    const btn = document.createElement('button');
    btn.textContent = 'Voter';
    btn.addEventListener('click', async () => {
      const guessedUserId = select.value;
      const msg = document.getElementById('voteMsg');
      msg.textContent = '';
      if (!currentUserId) { 
        msg.textContent = 'Veuillez vous inscrire d\'abord.'; 
        setTimeout(() => window.location.href = '/register.html', 2000);
        return; 
      }
      if (!guessedUserId) { msg.textContent = 'Veuillez choisir un prénom.'; return; }
      try {
        const res = await fetch('/api/vote', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voterUserId: currentUserId, songId: song.id, guessedUserId })
        });
        const data = await res.json();
        if (!res.ok) { 
          // Si l'utilisateur n'existe plus, on le redirige
          if (res.status === 404 && data.error.includes('introuvable')) {
            localStorage.removeItem('userId');
            localStorage.removeItem('firstName');
            alert('Votre session a expiré. Veuillez vous réinscrire.');
            window.location.href = '/register.html';
            return;
          }
          msg.textContent = data.error || 'Erreur de vote'; 
          return; 
        }
        msg.textContent = data.vote.isCorrect ? 'Bravo ! Bonne réponse.' : 'Raté, ce n\'est pas la bonne personne.';
      } catch (err) {
        msg.textContent = 'Erreur réseau';
      }
    });

    card.appendChild(title);
    card.appendChild(playerBox);
    card.appendChild(label);
    card.appendChild(select);
    card.appendChild(btn);
    container.appendChild(card);
  });
}

loadData();
