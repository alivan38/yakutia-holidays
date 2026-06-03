import { forwardRef } from 'react';
import SmartCaptchaWidget from './SmartCaptchaWidget';
import { SMARTCAPTCHA_CLIENT_KEY } from '../config/smartcaptcha.js';

const CaptchaField = forwardRef(function CaptchaField(
  { error, shake, onToken, onExpire, onError },
  ref,
) {
  if (!SMARTCAPTCHA_CLIENT_KEY) return null;

  return (
    <div
      ref={ref}
      className={[
        'captcha-block',
        error ? 'captcha-block--error' : '',
        shake ? 'captcha-block--shake' : '',
      ].filter(Boolean).join(' ')}
      aria-invalid={error || undefined}
    >
      <p className="captcha-block__label">Проверка безопасности *</p>
      <div className="captcha-block__widget">
        <SmartCaptchaWidget onToken={onToken} onExpire={onExpire} onError={onError} />
      </div>
      {error && (
        <p className="captcha-block__alert" role="alert">
          <span className="captcha-block__alert-icon" aria-hidden="true">!</span>
          Нажмите «Я не робот» и пройдите проверку перед отправкой
        </p>
      )}
    </div>
  );
});

export default CaptchaField;

export function isCaptchaConfigured() {
  return Boolean(SMARTCAPTCHA_CLIENT_KEY);
}
