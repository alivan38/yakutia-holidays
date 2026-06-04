export const SMARTCAPTCHA_CLIENT_KEY = (
  import.meta.env.VITE_SMARTCAPTCHA_CLIENT_KEY || ''
).trim();

/** Только для отладки: VITE_SMARTCAPTCHA_TEST=true */
export const SMARTCAPTCHA_TEST_MODE = import.meta.env.VITE_SMARTCAPTCHA_TEST === 'true';
