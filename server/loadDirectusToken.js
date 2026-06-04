import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

export function loadDirectusToken() {
  const fromEnv = process.env.DIRECTUS_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  const tokenFile =
    process.env.DIRECTUS_TOKEN_FILE?.trim() || join(rootDir, '.directus_token');
  if (existsSync(tokenFile)) {
    const cached = readFileSync(tokenFile, 'utf8').trim();
    if (cached) return cached;
  }

  return null;
}
