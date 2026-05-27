import pg from 'pg';

const oldDb = new pg.Client({
  connectionString: 'postgresql://postgres:123@localhost:5432/calendar_db'
});

async function migrate() {
  try {
    await oldDb.connect();
    console.log('✅ Подключились к PostgreSQL');

    // Авторизация в Directus
    const loginRes = await fetch('http://localhost:8055/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@yakutia.ru',
        password: 'admin123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.access_token;
    console.log('✅ Авторизовались в Directus');

    // Данные из PostgreSQL
    const { rows } = await oldDb.query('SELECT * FROM holidays');
    console.log(`📦 Найдено праздников: ${rows.length}`);

    if (rows.length === 0) {
      console.log('⚠️ Таблица holidays пустая!');
      return;
    }

    // Отправка в Directus по одному
    let count = 0;
    for (const row of rows) {
        const item = {
        id:          row.id,          // берём id из PostgreSQL
        title:       row.title       || null,
        people:      row.people      || null,
        date:        row.date        ? String(row.date).slice(0, 10) : null,
        description: row.description || null,
        region:      row.region      || null,
        images:      row.images      || null,
        };

      const res = await fetch('http://localhost:8055/items/holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(item)
      });

      const result = await res.json();
      if (result.errors) {
        console.error(`❌ Ошибка на "${item.title}":`, result.errors[0].message);
      } else {
        count++;
        console.log(`  ✔ ${count}. ${item.title}`);
      }
    }
    console.log(`\n✅ Готово! Перенесено: ${count} из ${rows.length}`);

  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  } finally {
    await oldDb.end();
  }
}

migrate();