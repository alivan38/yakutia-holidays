import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { randomBytes } from 'crypto';

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const TOKEN_FILE = process.env.DIRECTUS_TOKEN_FILE || '/data/directus_token';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@yakutia.ru';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function tokenWorks(token) {
  const r = await fetch(`${DIRECTUS_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.ok;
}

async function login() {
  const r = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(json?.errors?.[0]?.message || `Login failed (${r.status})`);
  }
  return json.data?.access_token;
}

async function setStaticToken(sessionToken, staticToken) {
  const r = await fetch(`${DIRECTUS_URL}/users/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: staticToken }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(json?.errors?.[0]?.message || `PATCH /users/me failed (${r.status})`);
  }
}

function saveToken(token) {
  mkdirSync('/data', { recursive: true });
  writeFileSync(TOKEN_FILE, token, 'utf8');
}

async function main() {
  if (process.env.DIRECTUS_TOKEN?.trim()) {
    const token = process.env.DIRECTUS_TOKEN.trim();
    if (!(await tokenWorks(token))) {
      throw new Error('DIRECTUS_TOKEN задан, но не проходит проверку /users/me');
    }
    process.stdout.write(token);
    return;
  }

  if (existsSync(TOKEN_FILE)) {
    const cached = readFileSync(TOKEN_FILE, 'utf8').trim();
    if (cached && (await tokenWorks(cached))) {
      process.stdout.write(cached);
      return;
    }
  }

  const staticToken =
    process.env.DIRECTUS_STATIC_TOKEN?.trim() ||
    randomBytes(32).toString('hex');

  const session = await login();
  await setStaticToken(session, staticToken);

  if (!(await tokenWorks(staticToken))) {
    throw new Error('Не удалось проверить статический токен после установки');
  }

  saveToken(staticToken);
  process.stdout.write(staticToken);
}

main().catch((err) => {
  console.error('❌ ensure-token:', err.message);
  process.exit(1);
});
