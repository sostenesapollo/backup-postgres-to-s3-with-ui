import dayjs from 'dayjs';
import pg from 'pg';
import { getSettings } from '~/routes/backup';

export async function countRecords(tableName="orders") {
  const settings = await getSettings()
  const client = new pg.Client({
    host: settings.host,
    user: settings.user,
    password: settings.password,
    database: settings.database,
    port: parseInt(settings.port),
  });

  await client.connect();

  const res = await client.query(`
    SELECT
      COUNT(*) AS count,
      (SELECT MAX(created_at) FROM ${tableName}) AS last_sale
    FROM orders;
  `);

  const { count, last_sale } = res.rows[0];

  await client.end();

  return { count, last_sale: dayjs(last_sale).add(-3, 'hours').format('DD/MM/YYYY HH:mm') };
}

// console.log('counting...');

// Example usage:
// countRecords('orders')
//   .then(({ count, last_sale }) => console.log(`Number of orders: ${count}, last sale at ${last_sale}`))
//   .catch(err => console.log('Error to 'err));
