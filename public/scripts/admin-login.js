// Connexion admin par code: définit un cookie via l'API puis redirige

async function adminLogin(e) {
  e.preventDefault();
  const msg = document.getElementById('adminLoginMsg');
  msg.textContent = '';
  const code = document.getElementById('adminCode').value.trim();
  if (!code) { msg.textContent = 'Veuillez entrer le code.'; return; }
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (!res.ok) { msg.textContent = data.error || 'Code invalide'; return; }
    // Cookie HttpOnly est posé par le serveur; rediriger vers /admin (route protégée)
    window.location.href = '/admin';
  } catch (err) {
    msg.textContent = 'Erreur réseau';
  }
}

document.getElementById('adminLoginForm').addEventListener('submit', adminLogin);
