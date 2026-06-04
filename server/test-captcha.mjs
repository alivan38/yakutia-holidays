import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const BASE = process.env.TEST_API_URL || 'http://localhost:8081';
const secret = process.env.SMARTCAPTCHA_SERVER_KEY?.trim();
const client = process.env.VITE_SMARTCAPTCHA_CLIENT_KEY?.trim();
const testMode = process.env.VITE_SMARTCAPTCHA_TEST === 'true';

const payload = {
  title: 'Тест капчи',
  description: 'Проверка рабочей капчи SmartCaptcha',
  people: 'Якуты',
};

async function postProposal(extra = {}) {
  const res = await fetch(`${BASE}/api/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, ...extra }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

async function validateYandex(token) {
  const body = new URLSearchParams({ secret, token });
  const res = await fetch('https://smartcaptcha.cloud.yandex.ru/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return { http: res.status, ...(await res.json()) };
}

async function checkFrontend() {
  const res = await fetch(`${BASE}/contribute`);
  const html = await res.text();
  const m = html.match(/src="(\/assets\/[^"]+\.js)"/);
  if (!m) return { ok: res.ok, hasClientKey: false, hasTestFlag: false };
  const jsRes = await fetch(`${BASE}${m[1]}`);
  const js = await jsRes.text();
  const hasClientKey = client && js.includes(client.slice(0, 16));
  const hasTestFlag = /test:\s*!0|test:!0/.test(js);
  return { ok: res.ok, hasClientKey, hasTestFlag };
}

const results = [];

results.push({
  name: 'test_mode_env',
  ok: !testMode,
  detail: testMode ? 'ВКЛ (нужен false для боя)' : 'выкл (рабочий режим)',
});

results.push({
  name: 'keys_configured',
  ok: client?.startsWith('ysc1_') && secret?.startsWith('ysc2_'),
  detail: client && secret ? 'client + server заданы' : 'не хватает ключей',
});

const noToken = await postProposal();
results.push({
  name: 'reject_without_token',
  ok: noToken.status === 400,
  detail: `HTTP ${noToken.status}: ${noToken.json?.error}`,
});

const fake = await postProposal({ captcha_token: 'invalid' });
results.push({
  name: 'reject_fake_token',
  ok: fake.status === 403,
  detail: `HTTP ${fake.status}: ${fake.json?.error}`,
});

const yx = await validateYandex('invalid');
results.push({
  name: 'yandex_api',
  ok: yx.status === 'failed',
  detail: yx.message || yx.status,
});

try {
  const fe = await checkFrontend();
  results.push({
    name: 'frontend_bundle',
    ok: fe.ok && fe.hasClientKey && !fe.hasTestFlag,
    detail: fe.ok
      ? (fe.hasClientKey ? 'ключ в сборке' : 'ключ не найден — пересоберите')
        + (fe.hasTestFlag ? ', тест-режим в JS!' : ', без test')
      : 'страница недоступна',
  });
} catch (e) {
  results.push({ name: 'frontend_bundle', ok: false, detail: e.message });
}

console.log('\n=== Проверка рабочей SmartCaptcha ===\n');
let passed = 0;
for (const r of results) {
  const mark = r.ok ? 'OK' : 'FAIL';
  if (r.ok) passed += 1;
  console.log(`[${mark}] ${r.name}: ${r.detail}`);
}
console.log(`\n${passed}/${results.length} автотестов`);
console.log('\nВ браузере: /contribute → «Я не робот» → отправить → 201 и «Спасибо»\n');
process.exit(passed === results.length ? 0 : 1);
