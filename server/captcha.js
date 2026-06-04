import fetch from 'node-fetch';

const VALIDATE_URL = 'https://smartcaptcha.cloud.yandex.ru/validate';

export function isCaptchaEnabled() {
  return Boolean(process.env.SMARTCAPTCHA_SERVER_KEY?.trim());
}

/** Проверка только если задан server key (или явно CAPTCHA_REQUIRED=true). */
export function isCaptchaRequired() {
  const flag = process.env.CAPTCHA_REQUIRED?.trim().toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'no') return false;
  if (flag === 'true' || flag === '1' || flag === 'yes') return true;
  return isCaptchaEnabled();
}

export function warnIfProductionWithoutCaptcha() {
  if (process.env.NODE_ENV !== 'production') return;
  if (isCaptchaEnabled()) return;
  console.warn(
    '⚠️  SMARTCAPTCHA_SERVER_KEY не задан — формы отправки без капчи. '
    + 'Для продакшена укажите ключи Yandex SmartCaptcha или CAPTCHA_REQUIRED=true.',
  );
}

export async function verifySmartCaptchaToken(token, remoteip) {
  const secret = process.env.SMARTCAPTCHA_SERVER_KEY?.trim();
  if (!secret || !token) return false;

  const body = new URLSearchParams({
    secret,
    token,
  });
  if (remoteip) body.set('ip', remoteip);

  try {
    const res = await fetch(VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      console.error('[captcha] SmartCaptcha validate HTTP', res.status);
      return false;
    }
    const json = await res.json();
    if (json.status !== 'ok') {
      console.warn('[captcha] SmartCaptcha:', json.message || json.status);
    }
    return json.status === 'ok';
  } catch (err) {
    console.error('[captcha] SmartCaptcha verify failed:', err.message);
    return false;
  }
}

function readCaptchaToken(req) {
  const fromBody = req.body?.captcha_token ?? req.body?.smart_token;
  if (fromBody && String(fromBody).trim()) return String(fromBody).trim();
  const fromHeader = req.headers['x-captcha-token'];
  if (fromHeader && String(fromHeader).trim()) return String(fromHeader).trim();
  return '';
}

export function verifyCaptchaMiddleware(req, res, next) {
  if (!isCaptchaRequired()) return next();

  const secret = process.env.SMARTCAPTCHA_SERVER_KEY?.trim();
  if (!secret) {
    return res.status(503).json({
      error: 'Проверка безопасности не настроена. Обратитесь к администратору сайта.',
    });
  }

  const token = readCaptchaToken(req);
  if (!token) {
    return res.status(400).json({ error: 'Подтвердите, что вы не робот' });
  }

  const remoteip = req.ip || req.socket?.remoteAddress;

  verifySmartCaptchaToken(token, remoteip).then((ok) => {
    if (!ok) {
      return res.status(403).json({
        error: 'Проверка не пройдена. Обновите страницу и попробуйте снова.',
      });
    }
    if (req.body && typeof req.body === 'object') {
      delete req.body.captcha_token;
      delete req.body.smart_token;
    }
    next();
  }).catch(() => {
    res.status(503).json({ error: 'Сервис проверки временно недоступен' });
  });
}
