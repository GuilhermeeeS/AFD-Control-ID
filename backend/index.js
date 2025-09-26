const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const { fetchAFD } = require('./fetchAFD');
const appConfig = require('./config/app.json');

const app = express();
app.use(express.json());

// configure express-session + file-store
app.use(session({
  store: new FileStore({ path: path.join(__dirname, 'sessions') }),
  secret: 'segredo-super-secreto', // pode ser qualquer string
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 } // 1 hora
}));

// serve frontend
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use(express.static(path.join(__dirname, '../frontend')));

const devicesFile = path.join(__dirname, 'devices.json');

// SHA-256('14e13y5a')
const STORED_HASH = 'f53101f688a218ba277be23863c56cdb1684a4a193eadc8e5fc5b0f4979d17a4';

// login
app.post('/api/login', async (req, res) => {
  const { username, passwordHash } = req.body || {};
  if (username === 'admin' && passwordHash === STORED_HASH) {
    req.session.user = 'admin';
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false });
});

// middleware de sessão
function requireSession(req, res, next) {
  if (req.session?.user === 'admin') return next();
  return res.status(401).json({ success: false, message: 'no session' });
}

// rotas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/api/devices', requireSession, (req, res) => {
  try {
    const data = fs.readFileSync(devicesFile, 'utf8');
    return res.json(JSON.parse(data));
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/devices/add', requireSession, (req, res) => {
  const { ip, serial } = req.body || {};
  if (!ip || !serial) return res.status(400).json({ success: false, message: 'missing ip or serial' });
  try {
    const data = JSON.parse(fs.readFileSync(devicesFile, 'utf8'));
    if (data.devices.find(d => d.ip === ip)) return res.status(400).json({ success: false, message: 'exists' });
    data.devices.push({ ip, serial });
    fs.writeFileSync(devicesFile, JSON.stringify(data, null, 2));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/devices/remove', requireSession, (req, res) => {
  const { ip } = req.body || {};
  if (!ip) return res.status(400).json({ success: false, message: 'missing ip' });
  try {
    const data = JSON.parse(fs.readFileSync(devicesFile, 'utf8'));
    data.devices = data.devices.filter(d => d.ip !== ip);
    fs.writeFileSync(devicesFile, JSON.stringify(data, null, 2));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/fetch-afd', requireSession, async (req, res) => {
  const { ip, serial, date } = req.body || {};
  if (!ip || !serial) return res.status(400).json({ success: false, message: 'missing ip or serial' });
  try {
    const result = await fetchAFD(ip, serial, date, appConfig);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(result.buffer);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`server listening ${PORT}`));
