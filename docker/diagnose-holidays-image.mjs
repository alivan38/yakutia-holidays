const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const TOKEN = process.env.DIRECTUS_TOKEN;

const headers = { Authorization: `Bearer ${TOKEN}` };

async function j(path, opts) {
  const r = await fetch(`${DIRECTUS_URL}${path}`, { ...opts, headers: { ...headers, ...opts?.headers } });
  const json = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, json };
}

async function main() {
  const rels = await j('/relations');
  const holidayRels = (rels.json?.data || []).filter(
    r =>
      String(r.collection || '').includes('holiday') ||
      r.meta?.one_collection === 'holidays' ||
      String(r.meta?.many_collection || '').includes('holiday'),
  );
  console.log('=== relations (holiday*) ===');
  for (const r of holidayRels) {
    console.log(
      `${r.collection}.${r.field} → one=${r.meta?.one_collection}.${r.meta?.one_field} junction_field=${r.meta?.junction_field}`,
    );
  }

  for (const name of ['image', 'images']) {
    const f = await j(`/fields/holidays/${name}`);
    if (f.ok) {
      console.log(`\n=== holidays.${name} ===`);
      console.log(JSON.stringify({
        type: f.json.data?.type,
        interface: f.json.data?.meta?.interface,
        special: f.json.data?.meta?.special,
        options: f.json.data?.meta?.options,
      }, null, 2));
    }
  }

  const p = await j('/fields/propsals/images');
  if (p.ok) {
    console.log('\n=== propsals.images (reference) ===');
    console.log(JSON.stringify({
      type: p.json.data?.type,
      interface: p.json.data?.meta?.interface,
      special: p.json.data?.meta?.special,
    }, null, 2));
  }

  for (const c of ['holidays_files', 'holidays_files_1', 'holidays_image', 'propsals_files', 'propsals_images']) {
    const cj = await j(`/collections/${c}`);
    console.log(`collection ${c}: ${cj.ok ? 'exists' : cj.status}`);
  }

  const items = await j('/items/holidays?fields=id,title,images&limit=5');
  console.log('\n=== holidays (images) ===');
  console.log(JSON.stringify(items.json?.data, null, 2));
  if (items.json?.errors) console.log('errors:', items.json.errors);

  for (const jname of ['holidays_files', 'holidays_files_1', 'holidays_image']) {
    const junc = await j(`/items/${jname}?limit=10`);
    console.log(`\n=== ${jname} rows (${junc.json?.data?.length ?? 0}) ===`);
    console.log(JSON.stringify(junc.json?.data, null, 2));
    if (junc.json?.errors) console.log('errors:', junc.json.errors);
  }
}

main().catch(console.error);
