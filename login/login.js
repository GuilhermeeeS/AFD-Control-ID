async function login() {
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value.trim();
  const errorDiv = document.getElementById('error-msg');

  errorDiv.textContent = '';

  if (!user || !pass) {
    errorDiv.textContent = 'Preencha usuário e senha.';
    return;
  }

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass })
  });

  if (res.ok) {
    localStorage.setItem('logado', 'true');
    window.location.href = '/home';
  } else {
    const { error } = await res.json();
    errorDiv.textContent = error || 'Erro no login.';
  }
}
