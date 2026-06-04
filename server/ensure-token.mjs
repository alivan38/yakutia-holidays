import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { resolveDirectusUrl } from './resolveDirectusUrl.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i <= 0) continue;
    const key = trimmed.slice(0, i).trim();
    if (process.env[key] === undefined) {
      process.env[key] = trimmed.slice(i + 1).trim();
    }
  }
}

loadEnvFile(join(rootDir, '.env'));

const DIRECTUS_URL = resolveDirectusUrl();
const TOKEN_FILE =
  process.env.DIRECTUS_TOKEN_FILE?.trim() || join(rootDir, '.directus_token');
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
  const dir = dirname(TOKEN_FILE);
  if (dir && dir !== '.') mkdirSync(dir, { recursive: true });
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
  console.error(`✅ Токен Directus сохранён в ${TOKEN_FILE}`);
  process.stdout.write(staticToken);
}

main().catch((err) => {
  console.error('❌ ensure-token:', err.message);
  process.exit(1);
});
