import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
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
const MAX_ATTEMPTS = Number(process.env.DIRECTUS_WAIT_ATTEMPTS || 45);
const DELAY_MS = Number(process.env.DIRECTUS_WAIT_DELAY_MS || 2000);
const isLocal = /localhost|127\.0\.0\.1/.test(DIRECTUS_URL);

async function ping() {
  const r = await fetch(`${DIRECTUS_URL}/server/health`, { signal: AbortSignal.timeout(3000) });
  return r.ok;
}

function tryDockerUp() {
  if (!isLocal) return;
  console.log('📦 Directus не отвечает — пробуем docker compose up -d directus…');
  const r = spawnSync('docker', ['compose', 'up', '-d', 'directus'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    console.warn('⚠️  Не удалось запустить Directus через Docker (запущен ли Docker Desktop?)');
  }
}

async function main() {
  try {
    if (await ping()) {
      console.log(`✅ Directus готов (${DIRECTUS_URL})`);
      return;
    }
  } catch {
  }

  tryDockerUp();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      if (await ping()) {
        console.log(`✅ Directus готов (${DIRECTUS_URL})`);
        return;
      }
    } catch {
    }
    console.log(`⏳ Directus ещё не готов (${attempt}/${MAX_ATTEMPTS}) — ${DIRECTUS_URL}`);
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  console.error(`❌ Directus не ответил: ${DIRECTUS_URL}`);
  console.error('   Запустите вручную: docker compose up -d directus');
  process.exit(1);
}

main();
