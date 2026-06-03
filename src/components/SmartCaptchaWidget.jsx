import { useEffect, useRef } from 'react';
import {
  SMARTCAPTCHA_CLIENT_KEY,
  SMARTCAPTCHA_TEST_MODE,
} from '../config/smartcaptcha.js';

const CAPTCHA_ORIGIN = 'https://smartcaptcha.cloud.yandex.ru';

let scriptPromise = null;

function loadSmartCaptchaScript() {
  if (window.smartCaptcha) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const cbName = '__yandexSmartCaptchaOnload';
      window[cbName] = () => {
        delete window[cbName];
        resolve();
      };
      const existing = document.querySelector('script[data-smart-captcha]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('captcha script')));
        return;
      }
      const script = document.createElement('script');
      script.src = `${CAPTCHA_ORIGIN}/captcha.js?render=onload&onload=${cbName}`;
      script.async = true;
      script.defer = true;
      script.dataset.smartCaptcha = '1';
      script.onerror = () => reject(new Error('captcha script'));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function resetSmartCaptcha(widgetId) {
  if (widgetId != null && window.smartCaptcha?.reset) {
    window.smartCaptcha.reset(widgetId);
  }
}

export default function SmartCaptchaWidget({ onToken, onError, onExpire }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const handlersRef = useRef({ onToken, onError, onExpire });

  useEffect(() => {
    handlersRef.current = { onToken, onError, onExpire };
  });

  useEffect(() => {
    if (!SMARTCAPTCHA_CLIENT_KEY) return undefined;

    let cancelled = false;
    const unsubs = [];

    loadSmartCaptchaScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.smartCaptcha) return;

        widgetIdRef.current = window.smartCaptcha.render(containerRef.current, {
          sitekey: SMARTCAPTCHA_CLIENT_KEY,
          hl: 'ru',
          ...(SMARTCAPTCHA_TEST_MODE ? { test: true } : {}),
          callback: (token) => handlersRef.current.onToken?.(token),
        });

        const wid = widgetIdRef.current;
        if (wid != null && window.smartCaptcha.subscribe) {
          unsubs.push(
            window.smartCaptcha.subscribe(wid, 'token-expired', () => {
              handlersRef.current.onToken?.('');
              handlersRef.current.onExpire?.();
            }),
          );
          unsubs.push(
            window.smartCaptcha.subscribe(wid, 'network-error', () => {
              handlersRef.current.onToken?.('');
              handlersRef.current.onError?.();
            }),
          );
        }
      })
      .catch(() => handlersRef.current.onError?.());

    return () => {
      cancelled = true;
      unsubs.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
      if (widgetIdRef.current != null && window.smartCaptcha?.destroy) {
        window.smartCaptcha.destroy(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!SMARTCAPTCHA_CLIENT_KEY) return null;

  return (
    <div
      className="captcha-widget"
      ref={containerRef}
      aria-label="Проверка Yandex SmartCaptcha"
    />
  );
}
