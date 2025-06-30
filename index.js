const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const app = express();
const PORT = 3000;

const publicDir = path.join(__dirname, 'public');
const loginDir = path.join(__dirname, 'login');
const ipsFile = path.join(__dirname, 'ips.json');

app.use(express.json());

// 1️⃣ Rota padrão → tela de login (login.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(loginDir, 'login.html'));
});

// 2️⃣ Rota de login.js e login.css (estáticos)
app.use('/login', express.static(loginDir));

// 3️⃣ Rota da home real (depois do login)
app.get('/home', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// 4️⃣ Depois sim libera os arquivos da public/
app.use(express.static(publicDir));

// 5️⃣ APIs
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === '123456') {
    return res.status(200).json({ message: 'Login ok' });
  }
  return res.status(401).json({ error: 'Usuário ou senha inválidos' });
});

app.get('/api/ips', (req, res) => {
  if (!fs.existsSync(ipsFile)) fs.writeFileSync(ipsFile, '[]');
  const ips = JSON.parse(fs.readFileSync(ipsFile));
  res.json(ips);
});

app.post('/api/add-ip', (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP é obrigatório' });

  const ips = JSON.parse(fs.readFileSync(ipsFile));
  if (ips.find(item => item.ip === ip)) {
    return res.status(400).json({ error: 'IP já cadastrado' });
  }

  ips.push({ ip });
  fs.writeFileSync(ipsFile, JSON.stringify(ips, null, 2));
  res.json({ message: 'IP adicionado', ip });
});

app.post('/api/remove-ip', (req, res) => {
  const { ip } = req.body;
  const ips = JSON.parse(fs.readFileSync(ipsFile));
  const updated = ips.filter(item => item.ip !== ip);
  fs.writeFileSync(ipsFile, JSON.stringify(updated, null, 2));
  res.json({ message: 'Removido' });
});

app.post('/api/afd', (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'Data é obrigatória' });

  const [year, month, day] = date.split('-').map(Number);
  const ips = JSON.parse(fs.readFileSync(ipsFile)).map(obj => obj.ip);
  const arquivos = [];

  for (const ip of ips) {
    try {
      const login = spawnSync('curl', [
        '-k', '-s', '-X', 'POST',
        '-H', 'Content-Type: application/json',
        '-d', '{"login":"admin","password":"admin"}',
        `https://${ip}/login.fcgi`
      ]);

      const loginOutput = login.stdout.toString();
      const { session } = JSON.parse(loginOutput);
      if (!session) throw new Error('Sessão não encontrada');

      const body = JSON.stringify({ initial_date: { day, month, year } });

      const afd = spawnSync('curl', [
        '-k', '-s', '-X', 'POST',
        '-H', 'Content-Type: application/json',
        '-d', body,
        `https://${ip}/get_afd.fcgi?session=${session}&mode=671`
      ]);

      const afdOutput = afd.stdout.toString();
      const filename = `afd_${ip.replace(/\./g, '_')}.txt`;
      const filePath = path.join(publicDir, filename);

      fs.writeFileSync(filePath, afdOutput);
      arquivos.push(filename);
    } catch (err) {
      console.error(`Erro no IP ${ip}:`, err.message);
    }
  }

  res.json({ arquivos });
});

app.get('/downloads/:filename', (req, res) => {
  const file = path.join(publicDir, req.params.filename);
  res.download(file, err => {
    if (!err) {
      fs.unlink(file, () => console.log(`🧹 Deletado: ${req.params.filename}`));
    }
  });
});

app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando em http://localhost:${PORT}`);
});
