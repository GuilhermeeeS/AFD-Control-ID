require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const ips = ['10.119.82.31', '10.119.82.32']; 

app.post('/api/afd', async (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'Data é obrigatória' });

  const [year, month, day] = date.split('-').map(Number);
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
      const filePath = path.join(__dirname, 'public', filename);

      fs.writeFileSync(filePath, afdOutput);
      arquivos.push(filename);

      console.log(`✅ AFD salvo: ${filename}`);
    } catch (err) {
      console.error(`❌ Erro no IP ${ip}:`, err.message);
    }
  }

  res.json({ arquivos });
});

app.get('/downloads/:filename', (req, res) => {
  const file = path.join(__dirname, 'public', req.params.filename);
  res.download(file, err => {
    if (!err) {
      fs.unlink(file, () => console.log(`🧹 Arquivo deletado: ${req.params.filename}`));
    }
  });
});

app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando em http://localhost:${PORT}`);
});
