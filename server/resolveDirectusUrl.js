export function resolveDirectusUrl() {
  const explicit = process.env.DIRECTUS_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const publicUrl = process.env.PUBLIC_DIRECTUS_URL?.trim();
  if (publicUrl) return publicUrl.replace(/\/$/, '');

  const port = process.env.DIRECTUS_PORT?.trim() || '8055';
  return `http://localhost:${port}`;
}
