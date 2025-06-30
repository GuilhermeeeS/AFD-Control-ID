const lista = document.getElementById('lista');
const form = document.getElementById('form-ip');
const input = document.getElementById('ip');
const dataInput = document.getElementById('data');
const arquivosDiv = document.getElementById('arquivos-gerados');

async function carregarIPs() {
  const res = await fetch('/api/ips');
  const ips = await res.json();

  lista.innerHTML = '';
  ips.forEach(({ ip }) => {
    const li = document.createElement('li');
    
    const span = document.createElement('span');
    span.textContent = ip;

    const button = document.createElement('button');
    button.textContent = '❌';
    button.className = 'remover-btn';
    button.onclick = () => removerIP(ip);

    li.appendChild(span);
    li.appendChild(button);
    lista.appendChild(li);
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const ip = input.value.trim();
  if (!ip) return;

  await fetch('/api/add-ip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip })
  });

  input.value = '';
  carregarIPs();
});

async function removerIP(ip) {
  await fetch('/api/remove-ip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip })
  });

  carregarIPs();
}

async function coletarAFD() {
  const date = dataInput.value;
  if (!date) return alert('Informe a data!');

  const res = await fetch('/api/afd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date })
  });

  const { arquivos } = await res.json();

  arquivosDiv.innerHTML = '<h3>📂 Arquivos gerados:</h3>';
  arquivos.forEach(arq => {
    const link = document.createElement('a');
    link.href = `/downloads/${arq}`;
    link.innerText = arq;
    arquivosDiv.appendChild(link);
  });
}

carregarIPs();
