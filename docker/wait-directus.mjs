const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const MAX_ATTEMPTS = Number(process.env.DIRECTUS_WAIT_ATTEMPTS || 60);
const DELAY_MS = Number(process.env.DIRECTUS_WAIT_DELAY_MS || 2000);

async function ping() {
  const r = await fetch(`${DIRECTUS_URL}/server/health`);
  return r.ok;
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  try {
    if (await ping()) {
      console.log(`✅ Directus готов (${DIRECTUS_URL})`);
      process.exit(0);
    }
  } catch {
  }
  console.log(`⏳ Directus ещё не готов (${attempt}/${MAX_ATTEMPTS})…`);
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
}

console.error(`❌ Directus не ответил за ${MAX_ATTEMPTS} попыток`);
process.exit(1);
