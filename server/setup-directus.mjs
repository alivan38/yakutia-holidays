import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { resolveDirectusUrl } from './resolveDirectusUrl.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });
dotenv.config({ path: join(__dirname, '.env') });

const DIRECTUS_URL = resolveDirectusUrl();
const TOKEN_FILE = process.env.DIRECTUS_TOKEN_FILE || '/data/directus_token';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@yakutia.ru';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

let TOKEN = '';
let headers = {};

async function tokenWorks(token) {
  if (!token) return false;
  const r = await fetch(`${DIRECTUS_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.ok;
}

async function login() {
  const r = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(json?.errors?.[0]?.message || `Login failed (${r.status})`);
  }
  return json.data?.access_token;
}

async function resolveDirectusToken() {
  const fromEnv = process.env.DIRECTUS_TOKEN?.trim();
  if (fromEnv && (await tokenWorks(fromEnv))) return fromEnv;

  if (existsSync(TOKEN_FILE)) {
    const cached = readFileSync(TOKEN_FILE, 'utf8').trim();
    if (cached && (await tokenWorks(cached))) return cached;
  }

  const staticToken = process.env.DIRECTUS_STATIC_TOKEN?.trim();
  if (staticToken && (await tokenWorks(staticToken))) return staticToken;

  const session = await login();
  if (session && (await tokenWorks(session))) return session;

  return null;
}

async function api(method, path, body) {
  const r = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, json };
}

const HOLIDAYS_IMAGE_JUNCTION = 'holidays_files';
const HOLIDAY_FILES_FIELD = 'images';
const LEGACY_HOLIDAY_IMAGE_FIELD = 'image';

async function getField(collection, field) {
  const r = await api('GET', `/fields/${collection}/${field}`);
  return r.ok ? r.json.data : null;
}

async function collectionExists(name) {
  const r = await api('GET', `/collections/${name}`);
  return r.ok;
}

async function deleteField(collection, field) {
  const exists = await api('GET', `/fields/${collection}/${field}`);
  if (!exists.ok) return false;

  console.log(`Удаляю ${collection}.${field}...`);
  const del = await api('DELETE', `/fields/${collection}/${field}`);
  if (!del.ok) {
    console.warn(`⚠️ ${collection}.${field}:`, JSON.stringify(del.json, null, 2));
    return false;
  }
  console.log(`✅ ${collection}.${field} удалено.`);
  return true;
}

async function deleteCollection(name) {
  if (!(await collectionExists(name))) return;
  console.log(`Удаляю коллекцию ${name}...`);
  const del = await api('DELETE', `/collections/${name}`);
  if (del.ok) console.log(`✅ ${name} удалена.`);
  else console.warn(`⚠️ ${name}:`, JSON.stringify(del.json, null, 2));
}

async function getHolidayPrimaryKeyType() {
  const r = await api('GET', '/fields/holidays');
  if (!r.ok) return 'integer';
  const idField = r.json.data?.find(f => f.field === 'id' || f.schema?.is_primary_key);
  return idField?.type || 'integer';
}

async function deleteRelationsForHolidayImage() {
  const rels = await api('GET', '/relations');
  if (!rels.ok || !Array.isArray(rels.json?.data)) return;

  for (const rel of rels.json.data) {
    const byAlias =
      (rel.meta?.one_field === HOLIDAY_FILES_FIELD || rel.meta?.one_field === LEGACY_HOLIDAY_IMAGE_FIELD) &&
      rel.meta?.one_collection === 'holidays';
    const byJunction =
      rel.collection === HOLIDAYS_IMAGE_JUNCTION ||
      rel.collection === 'holidays_files_1' ||
      rel.collection === 'holidays_image' ||
      rel.collection === 'holidays_images';
    if (!byAlias && !byJunction) continue;

    console.log(`Удаляю связь ${rel.collection}.${rel.field}...`);
    const del = await api('DELETE', `/relations/${rel.collection}/${rel.field}`);
    if (del.ok) console.log('✅ Связь удалена.');
    else console.warn('⚠️ Связь:', JSON.stringify(del.json, null, 2));
  }
}

async function createFieldIfMissing(collection, payload) {
  if (await getField(collection, payload.field)) return true;
  const created = await api('POST', `/fields/${collection}`, payload);
  if (!created.ok) {
    console.error(`❌ ${collection}.${payload.field}:`, JSON.stringify(created.json, null, 2));
    return false;
  }
  console.log(`✅ ${collection}.${payload.field} создано.`);
  return true;
}

async function relationExists(collection, field) {
  const r = await api('GET', `/relations/${collection}/${field}`);
  return r.ok;
}

async function getRelation(collection, field) {
  const r = await api('GET', `/relations/${collection}/${field}`);
  return r.ok ? r.json.data : null;
}

async function getLinkedJunction(collection, aliasField) {
  const rels = await api('GET', '/relations');
  if (!rels.ok || !Array.isArray(rels.json?.data)) return null;
  const rel = rels.json.data.find(
    r => r.meta?.one_collection === collection && r.meta?.one_field === aliasField,
  );
  return rel?.collection ?? null;
}

async function holidayImagesReadable() {
  const r = await api('GET', `/items/holidays?fields=${HOLIDAY_FILES_FIELD}&limit=1`);
  return r.ok && !r.json?.errors?.length;
}

async function holidayImageRelationsHealthy() {
  if (!isFilesAliasField(await getField('holidays', HOLIDAY_FILES_FIELD))) return false;

  const linkedJunction = await getLinkedJunction('holidays', HOLIDAY_FILES_FIELD);
  if (linkedJunction !== HOLIDAYS_IMAGE_JUNCTION) {
    if (linkedJunction) {
      console.log(`⚠️ holidays.${HOLIDAY_FILES_FIELD} → junction «${linkedJunction}», ожидается «${HOLIDAYS_IMAGE_JUNCTION}»`);
    }
    return false;
  }

  if (!(await collectionExists(HOLIDAYS_IMAGE_JUNCTION))) return false;

  const parentRel = await getRelation(HOLIDAYS_IMAGE_JUNCTION, 'holidays_id');
  const fileRel = await getRelation(HOLIDAYS_IMAGE_JUNCTION, 'directus_files_id');
  if (!parentRel || !fileRel) return false;

  const parentMeta = parentRel.meta || {};
  const fileMeta = fileRel.meta || {};
  const parentFk = parentRel.schema?.foreign_key_table === 'holidays';
  const fileFk = fileRel.schema?.foreign_key_table === 'directus_files';

  return (
    parentMeta.one_collection === 'holidays' &&
    parentMeta.one_field === HOLIDAY_FILES_FIELD &&
    parentMeta.junction_field === 'directus_files_id' &&
    fileMeta.junction_field === 'holidays_id' &&
    parentFk &&
    fileFk &&
    (await holidayImagesReadable())
  );
}

async function upsertRelation(collection, field, payload) {
  if (await relationExists(collection, field)) {
    const r = await api('PATCH', `/relations/${collection}/${field}`, payload);
    if (!r.ok) {
      console.error(`❌ PATCH связь ${collection}.${field}:`, JSON.stringify(r.json, null, 2));
      return false;
    }
    console.log(`✅ Связь ${collection}.${field} обновлена.`);
    return true;
  }

  const r = await api('POST', '/relations', { collection, field, ...payload });
  if (!r.ok) {
    console.error(`❌ Связь ${collection}.${field}:`, JSON.stringify(r.json, null, 2));
    return false;
  }
  console.log(`✅ Связь ${collection}.${field} создана.`);
  return true;
}

async function ensureJunctionCollection() {
  if (await collectionExists(HOLIDAYS_IMAGE_JUNCTION)) return true;

  const coll = await api('POST', '/collections', {
    collection: HOLIDAYS_IMAGE_JUNCTION,
    meta: { hidden: true, icon: 'import_export', note: 'Связь holidays ↔ directus_files' },
    schema: {},
  });
  if (!coll.ok) {
    console.error('❌ Коллекция junction:', JSON.stringify(coll.json, null, 2));
    return false;
  }
  console.log(`✅ ${HOLIDAYS_IMAGE_JUNCTION} создана.`);
  return true;
}

async function ensureJunctionFields(pkFieldType) {
  const holidaysFk = {
    field: 'holidays_id',
    type: pkFieldType,
    meta: { interface: 'select-dropdown-m2o', hidden: true, special: ['m2o'] },
    schema: {
      is_nullable: true,
      foreign_key_table: 'holidays',
      foreign_key_column: 'id',
    },
  };
  const filesFk = {
    field: 'directus_files_id',
    type: 'uuid',
    meta: { interface: 'file', hidden: true, special: ['file'] },
    schema: {
      is_nullable: true,
      foreign_key_table: 'directus_files',
      foreign_key_column: 'id',
    },
  };
  const sortField = {
    field: 'sort',
    type: 'integer',
    meta: { interface: 'input', hidden: true },
    schema: { is_nullable: true },
  };

  for (const payload of [holidaysFk, filesFk, sortField]) {
    const existing = await getField(HOLIDAYS_IMAGE_JUNCTION, payload.field);
    if (!existing) {
      if (!(await createFieldIfMissing(HOLIDAYS_IMAGE_JUNCTION, payload))) return false;
      continue;
    }
    const patch = await api('PATCH', `/fields/${HOLIDAYS_IMAGE_JUNCTION}/${payload.field}`, {
      meta: payload.meta,
      schema: payload.schema,
    });
    if (!patch.ok) {
      console.warn(`⚠️ PATCH ${HOLIDAYS_IMAGE_JUNCTION}.${payload.field}:`, JSON.stringify(patch.json, null, 2));
    }
  }
  return true;
}

async function ensureHolidayImageRelations() {
  const parentOk = await upsertRelation(HOLIDAYS_IMAGE_JUNCTION, 'holidays_id', {
    related_collection: 'holidays',
    schema: {
      table: HOLIDAYS_IMAGE_JUNCTION,
      column: 'holidays_id',
      foreign_key_table: 'holidays',
      foreign_key_column: 'id',
      on_update: 'NO ACTION',
      on_delete: 'CASCADE',
    },
    meta: {
      many_collection: HOLIDAYS_IMAGE_JUNCTION,
      many_field: 'holidays_id',
      one_collection: 'holidays',
      one_field: HOLIDAY_FILES_FIELD,
      junction_field: 'directus_files_id',
      sort_field: 'sort',
    },
  });

  const fileOk = await upsertRelation(HOLIDAYS_IMAGE_JUNCTION, 'directus_files_id', {
    related_collection: 'directus_files',
    schema: {
      table: HOLIDAYS_IMAGE_JUNCTION,
      column: 'directus_files_id',
      foreign_key_table: 'directus_files',
      foreign_key_column: 'id',
      on_update: 'NO ACTION',
      on_delete: 'SET NULL',
    },
    meta: {
      many_collection: HOLIDAYS_IMAGE_JUNCTION,
      many_field: 'directus_files_id',
      one_collection: 'directus_files',
      one_field: null,
      junction_field: 'holidays_id',
      sort_field: null,
    },
  });

  return parentOk && fileOk;
}

async function createHolidayImageAlias() {
  if (await getField('holidays', HOLIDAY_FILES_FIELD)) return true;

  const aliasCreated = await api('POST', '/fields/holidays', {
    field: HOLIDAY_FILES_FIELD,
    type: 'alias',
    meta: {
      interface: 'files',
      special: ['files'],
      width: 'full',
      sort: 9,
      note: 'Фотографии праздника (можно несколько)',
      options: {},
    },
  });
  if (!aliasCreated.ok) {
    console.error(`❌ holidays.${HOLIDAY_FILES_FIELD}:`, JSON.stringify(aliasCreated.json, null, 2));
    return false;
  }
  console.log(`✅ holidays.${HOLIDAY_FILES_FIELD} (alias / Files) создано.`);
  return true;
}

async function rebuildHolidayImageField(pkFieldType) {
  console.log(`Починка holidays.${HOLIDAY_FILES_FIELD} (junction ${HOLIDAYS_IMAGE_JUNCTION})...`);
  await deleteField('holidays', HOLIDAY_FILES_FIELD);
  await deleteField('holidays', LEGACY_HOLIDAY_IMAGE_FIELD);
  await deleteRelationsForHolidayImage();
  await deleteCollection('holidays_files_1');
  await deleteCollection('holidays_image');
  await deleteCollection('holidays_images');
  await deleteCollection(HOLIDAYS_IMAGE_JUNCTION);

  if (!(await ensureJunctionCollection())) return false;
  if (!(await ensureJunctionFields(pkFieldType))) return false;
  if (!(await ensureHolidayImageRelations())) return false;
  if (!(await createHolidayImageAlias())) return false;

  return holidayImageRelationsHealthy();
}

async function removeHolidaysEventsRelation() {
  const rels = await api('GET', '/relations');
  if (!rels.ok || !Array.isArray(rels.json?.data)) return;

  for (const rel of rels.json.data) {
    const touchesHolidaysEvents =
      (rel.meta?.one_field === 'events' && rel.meta?.one_collection === 'holidays') ||
      (rel.meta?.many_field === 'events' && rel.meta?.many_collection === 'holidays');
    if (!touchesHolidaysEvents) continue;

    console.log(`Удаляю связь holidays.events...`);
    const del = await api('DELETE', `/relations/${rel.collection}/${rel.field}`);
    if (del.ok) console.log('✅ Связь удалена.');
    else console.warn('⚠️ Связь:', JSON.stringify(del.json, null, 2));
  }
}

async function setupProposals() {
  console.log('\n— propsals —');
  const existing = await api('GET', '/fields/propsals/author_email');
  if (!existing.ok) {
    console.log('Добавляю propsals.author_email...');
    const created = await api('POST', '/fields/propsals', {
      field: 'author_email',
      type: 'string',
      meta: {
        interface: 'input',
        width: 'half',
        required: false,
        note: 'Email автора предложения',
        sort: 40,
        options: { placeholder: 'example@mail.ru' },
      },
      schema: { is_nullable: true, max_length: 254 },
    });
    if (!created.ok) {
      console.error('❌ propsals.author_email:', JSON.stringify(created.json, null, 2));
      process.exit(1);
    }
    console.log('✅ propsals.author_email создано.');
  } else {
    console.log('✅ propsals.author_email уже есть.');
  }

  if (process.env.DIRECTUS_CLEANUP_LEGACY === 'true') {
    for (const field of ['holiday_id', 'holiday_events', 'holiday_date']) {
      await deleteField('propsals', field);
    }
  }
}

function isFilesAliasField(field) {
  if (!field || field.type !== 'alias') return false;
  if (field.meta?.interface === 'files') return true;
  const special = field.meta?.special;
  return Array.isArray(special) && special.includes('files');
}

async function setupHolidays() {
  if (process.env.DIRECTUS_CLEANUP_LEGACY !== 'true') return;
  console.log('\n— holidays (legacy cleanup) —');
  await removeHolidaysEventsRelation();
  for (const field of ['source', 'events']) {
    await deleteField('holidays', field);
  }
}

async function setupHolidayImages() {
  console.log(`\n— holidays.${HOLIDAY_FILES_FIELD} —`);

  const forceRebuild = process.env.DIRECTUS_FORCE_IMAGE_REBUILD === 'true';
  const field = await getField('holidays', HOLIDAY_FILES_FIELD);
  const legacyField = await getField('holidays', LEGACY_HOLIDAY_IMAGE_FIELD);
  const holidayPkType = await getHolidayPrimaryKeyType();
  const pkFieldType = holidayPkType === 'uuid'
    ? 'uuid'
    : (holidayPkType === 'string' || holidayPkType === 'text' ? 'string' : 'integer');

  if (!forceRebuild && (await holidayImageRelationsHealthy()) && !legacyField) {
    console.log(`✅ holidays.${HOLIDAY_FILES_FIELD} (Files M2M) настроено корректно.`);
    return;
  }

  if (field && !isFilesAliasField(field) && field.type !== 'json') {
    console.log(`⚠️ holidays.${HOLIDAY_FILES_FIELD} имеет тип «${field.type}» — оставляю как есть (не трогаю).`);
    return;
  }

  if (legacyField) {
    console.log(`⚠️ Удаляю устаревшее поле holidays.${LEGACY_HOLIDAY_IMAGE_FIELD} (замена на ${HOLIDAY_FILES_FIELD}).`);
  }
  if (forceRebuild) {
    console.log('⚠️ DIRECTUS_FORCE_IMAGE_REBUILD=true — принудительная пересборка поля фото.');
  }
  if (field || legacyField || (await collectionExists('holidays_image'))) {
    console.log('⚠️ Пересоздаю поле фото: holidays.images + junction holidays_files.');
  }

  const ok = await rebuildHolidayImageField(pkFieldType);
  if (!ok) {
    console.error(`❌ Не удалось настроить holidays.${HOLIDAY_FILES_FIELD}. См. логи выше.`);
    process.exit(1);
  }
  console.log(`✅ holidays.${HOLIDAY_FILES_FIELD} готово — перезагрузите Directus (Ctrl+F5) и снова загрузите фото.`);
}

async function main() {
  TOKEN = await resolveDirectusToken();
  if (!TOKEN) {
    console.error('❌ Не удалось получить токен Directus.');
    console.error('   Проверьте ADMIN_EMAIL / ADMIN_PASSWORD в .env и что Directus запущен.');
    console.error('   Или: docker compose restart api');
    process.exit(1);
  }
  headers = {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };

  console.log(`Directus: ${DIRECTUS_URL}`);
  await setupProposals();
  await setupHolidays();
  await setupHolidayImages();
  console.log('\nГотово.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
