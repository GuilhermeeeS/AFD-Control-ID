const { spawnSync } = require('child_process');

function generateFileName(serial) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `AFD${serial}${year}${month}${day}${hour}${minute}${second}.txt`;
}

function normalizeDateInput(date) {
  if (!date) {
    const now = new Date();
    return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
  }
  if (typeof date === 'string') {
    // expected 'YYYY-MM-DD'
    const parts = date.split('-').map(Number);
    if (parts.length === 3) return { day: parts[2], month: parts[1], year: parts[0] };
  }
  // assume already object { day, month, year }
  return date;
}

async function fetchAFD(ip, serial, date, appConfig) {
  const cfg = appConfig || { maxRetries: 3, retryDelay: 3000 };
  const deviceUser = 'admin';
  const devicePass = '14e13y5a';
  const dateObj = normalizeDateInput(date);

  let attempt = 0;
  while (attempt <= cfg.maxRetries) {
    try {
      // 1) login
      const loginPayload = JSON.stringify({ login: deviceUser, password: devicePass });
      const login = spawnSync('curl', [
        '-k', '-s', '-X', 'POST',
        '-H', 'Content-Type: application/json',
        '-d', loginPayload,
        `https://${ip}/login.fcgi`
      ], { timeout: 20000 });

      if (login.error) throw login.error;
      const loginOut = login.stdout ? login.stdout.toString('utf8') : '';

      let session;
      try {
        const parsed = JSON.parse(loginOut);
        session = parsed.session;
        if (!session) throw new Error('session not returned');
      } catch (err) {
        throw new Error(`login parse error: ${err.message} | raw: ${loginOut}`);
      }

      // 2) small wait
      await new Promise(r => setTimeout(r, 1000));

      // 3) request AFD
      const body = JSON.stringify({ initial_date: dateObj });
      const afd = spawnSync('curl', [
        '-k', '-s', '-X', 'POST',
        '-H', 'Content-Type: application/json',
        '-d', body,
        `https://${ip}/get_afd.fcgi?session=${session}&mode=671`
      ], { timeout: 30000 });

      if (afd.error) throw afd.error;
      const stdout = afd.stdout;
      if (!stdout || stdout.length === 0) {
        const stderr = afd.stderr ? afd.stderr.toString('utf8') : '';
        throw new Error(`AFD empty. stderr: ${stderr}`);
      }

      const filename = generateFileName(serial);
      // return buffer and filename
      return { filename, buffer: Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout) };
    } catch (err) {
      attempt++;
      if (attempt > cfg.maxRetries) {
        throw new Error(`failed after ${cfg.maxRetries + 1} attempts: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, cfg.retryDelay));
    }
  }
}

module.exports = { fetchAFD };
