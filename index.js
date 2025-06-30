const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const app = express();
const PORT = 3000;

const publicDir = path.join(__dirname, 'public');
const ipsFile = path.join(__dirname, 'ips.json');

app.use(express.json());
app.use(express.static(publicDir));

function loadIPs() {
  if (!fs.existsSync(ipsFile)) fs.writeFileSync(ipsFile, '[]');
  return JSON.parse(fs.readFileSync(ipsFile));
}

function saveIPs(ips) {
  fs.writeFileSync(ipsFile, JSON.stringify(ips, null, 2));
}

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/api/ips', (req, res) => {
  const ips = loadIPs();
  res.json(ips);
});

app.post('/api/add-ip', (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP é obrigatório' });

  const ips = loadIPs();
  if (ips.find(item => item.ip === ip)) {
    return res.status(400).json({ error: 'IP já cadastrado' });
  }

  ips.push({ ip });
  saveIPs(ips);
  res.json({ message: 'IP adicionado com sucesso', ip });
});

app.post('/api/remove-ip', (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP é obrigatório' });

  const updated = loadIPs().filter(item => item.ip !== ip);
  saveIPs(updated);
  res.json({ message: 'IP removido com sucesso' });
});

app.post('/api/afd', (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'Data é obrigatória' });

  const [year, month, day] = date.split('-').map(Number);
  const ips = loadIPs().map(obj => obj.ip);
  const arquivos = [];

  for (const ip of ips) {
    try {
      console.log(`🔐 Conectando no relógio ${ip}...`);

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

      console.log(`✅ AFD salvo: ${filename}`);
    } catch (err) {
      console.error(`❌ Erro ao coletar do IP ${ip}:`, err.message);
    }
  }

  res.json({ arquivos });
});

app.get('/downloads/:filename', (req, res) => {
  const file = path.join(publicDir, req.params.filename);
  res.download(file, err => {
    if (!err) {
      fs.unlink(file, () => console.log(`🧹 Arquivo deletado: ${req.params.filename}`));
    }
  });
});

app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando em http://localhost:${PORT}`);
});
