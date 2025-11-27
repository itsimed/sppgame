// Soumission de chanson par un utilisateur logué (via localStorage)

async function submitSong(e) {
  e.preventDefault();
  const userId = localStorage.getItem('userId');
  const msg = document.getElementById('songMsg');
  if (!userId) { 
    msg.textContent = 'Veuillez vous inscrire d\'abord.';
    setTimeout(() => window.location.href = '/register.html', 2000);
    return; 
  }
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
    if (!res.ok) { 
      // Si l'utilisateur n'existe plus en base, on le redirige
      if (res.status === 404 && data.error.includes('introuvable')) {
        localStorage.removeItem('userId');
        localStorage.removeItem('firstName');
        alert('Votre session a expiré. Veuillez vous réinscrire.');
        window.location.href = '/register.html';
        return;
      }
      msg.textContent = data.error || 'Erreur de soumission'; 
      return; 
    }
    msg.textContent = 'Chanson soumise avec succès ! Redirection...';
    // Redirection automatique vers le vote après 1 seconde
    setTimeout(() => window.location.href = '/vote.html', 1000);
  } catch (err) {
    msg.textContent = 'Erreur réseau';
  }
}

document.getElementById('songForm').addEventListener('submit', submitSong);

// Vérifier si l'utilisateur est connecté au chargement
window.addEventListener('DOMContentLoaded', async () => {
  const userId = localStorage.getItem('userId');
  const firstName = localStorage.getItem('firstName');
  const msg = document.getElementById('songMsg');
  
  if (userId && firstName) {
    // Vérifier que l'utilisateur existe toujours en base
    try {
      const res = await fetch('/api/users');
      const users = await res.json();
      const userExists = users.find(u => u.id === userId);
      
      if (!userExists) {
        localStorage.removeItem('userId');
        localStorage.removeItem('firstName');
        msg.textContent = 'Session expirée. Redirection...';
        msg.style.color = '#dc2626';
        setTimeout(() => window.location.href = '/register.html', 2000);
        return;
      }
      
      msg.textContent = `Connecté en tant que: ${firstName}`;
      msg.style.color = '#2563eb';
    } catch (err) {
      msg.textContent = 'Erreur de connexion';
      msg.style.color = '#dc2626';
    }
  } else {
    msg.textContent = 'Veuillez vous inscrire d\'abord. Redirection...';
    msg.style.color = '#dc2626';
    setTimeout(() => window.location.href = '/register.html', 2000);
  }
});
