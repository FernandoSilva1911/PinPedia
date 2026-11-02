// Conexão com o PostgreSQL.

require("dotenv").config();
const { Pool, types } = require("pg");

// Devolve as colunas DATE como texto "AAAA-MM-DD". Convertidas para Date,
// datas como 1500-04-22 chegavam ao frontend com fuso e horário.
types.setTypeParser(1082, (valor) => valor);

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // na Vercel cada instância abre o seu pool; por isso poucas conexões
      // e o Transaction pooler do Supabase (porta 6543)
      max: 3,
      idleTimeoutMillis: 10000,
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

module.exports = {
  query: (texto, params) => pool.query(texto, params),
  pool,
};
