import { apiPath } from './baseUrl.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function directusAssetUrl(fileId, transforms = {}) {
  if (!fileId) return '';

  const params = new URLSearchParams();
  if (transforms.width) params.set('width', transforms.width);
  if (transforms.height) params.set('height', transforms.height);
  if (transforms.quality) params.set('quality', transforms.quality);
  const qs = params.toString();
  const query = qs ? `?${qs}` : '';

  if (/^https?:\/\//i.test(fileId)) {
    const m = String(fileId).match(/\/assets\/([0-9a-f-]{36})/i);
    const sameOriginApi =
      import.meta.env.VITE_API_URL === '' || import.meta.env.VITE_API_URL == null;
    if (m && sameOriginApi) {
      return apiPath(`/api/assets/${m[1]}${query}`);
    }
    return fileId;
  }

  const id = String(fileId).trim();
  if (!UUID_RE.test(id)) return '';

  const sameOriginApi =
    import.meta.env.VITE_API_URL === '' || import.meta.env.VITE_API_URL == null;
  const external = import.meta.env.VITE_DIRECTUS_URL?.trim();
  if (!sameOriginApi && external) {
    return `${external.replace(/\/$/, '')}/assets/${id}${query}`;
  }

  return apiPath(`/api/assets/${id}${query}`);
}
