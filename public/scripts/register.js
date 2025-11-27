// Script d'inscription des utilisateurs (prénom uniquement)
// Sauvegarde l'ID utilisateur dans localStorage pour usage ultérieur

async function fetchUsers() {
  const res = await fetch('/api/users');
  const users = await res.json();
  const box = document.getElementById('usersList');
  if (!box) return; // Si l'élément n'existe pas, on skip
  box.innerHTML = '';
  users.forEach(u => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.textContent = `${u.firstName}`;
    box.appendChild(div);
  });
}

async function register(e) {
  e.preventDefault();
  const firstName = document.getElementById('firstName').value.trim();
  const msg = document.getElementById('registerMsg');
  msg.textContent = '';
  if (!firstName) { msg.textContent = 'Veuillez entrer un prénom.'; return; }
  try {
    const res = await fetch('/api/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName })
    });
    const data = await res.json();
    if (!res.ok) { msg.textContent = data.error || 'Erreur d\'inscription'; return; }
    localStorage.setItem('userId', data.user.id);
    localStorage.setItem('firstName', data.user.firstName);
    // Redirection automatique vers la soumission de chanson
    window.location.href = '/submit.html';
  } catch (err) {
    msg.textContent = 'Erreur réseau';
  }
}

document.getElementById('registerForm').addEventListener('submit', register);
if (document.getElementById('usersList')) {
  fetchUsers();
}
