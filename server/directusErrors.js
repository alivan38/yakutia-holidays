export function isDirectusConnectionError(err) {
  const code = err?.code ?? err?.cause?.code ?? err?.errno;
  return (
    code === 'ECONNREFUSED'
    || code === 'ENOTFOUND'
    || code === 'ETIMEDOUT'
    || code === 'ECONNRESET'
    || (err?.type === 'system' && err?.code === 'ECONNREFUSED')
  );
}

export function directusUnreachableBody(directusUrl) {
  return {
    error: 'Directus недоступен. Запустите: docker compose up -d directus',
    code: 'DIRECTUS_UNREACHABLE',
    directusUrl,
  };
}

export function respondDirectusError(res, err, directusUrl, fallbackMessage) {
  if (isDirectusConnectionError(err)) {
    console.error(`[Directus] ${directusUrl} —`, err.code || err.message);
    return res.status(503).json(directusUnreachableBody(directusUrl));
  }
  console.error(fallbackMessage, err);
  return res.status(500).json({ error: fallbackMessage });
}
