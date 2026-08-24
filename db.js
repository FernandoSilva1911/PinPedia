// db.js: ponto único de conexão com o PostgreSQL.
// Qualquer arquivo do backend que precisar falar com o banco importa
// este módulo em vez de criar sua própria conexão.

require("dotenv").config();
const { Pool, types } = require("pg");

// Por padrão o pg converte colunas DATE em objeto Date do JavaScript. Isso
// atrapalha o frontend: o res.json() transforma esse Date em texto ISO completo
// ("1500-04-22T03:00:00.000Z"), o que estraga a exibição da data e deixa o
// <input type="date"> vazio na hora de editar um pin. Aqui pedimos ao pg para
// devolver a coluna DATE exatamente como ela está no banco: o texto "AAAA-MM-DD".
// (1082 é o código que o PostgreSQL usa para o tipo DATE.)
types.setTypeParser(1082, (valor) => valor);

// Se DATABASE_URL estiver definida (caso de bancos na nuvem, como Neon),
// ela tem prioridade e já vem com tudo (host, porta, usuário, senha, banco).
// Se não estiver definida, usa as variáveis separadas (caso do Postgres local).
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // necessário pra a maioria dos provedores na nuvem
      // Na Vercel cada requisição pode acordar uma cópia diferente da função,
      // e cada cópia abre o seu próprio pool. Com um limite alto, um pico de
      // acessos estoura o número de conexões que o banco aceita. Por isso o
      // DATABASE_URL deve apontar para o **pooler** do Supabase (porta 6543,
      // "Transaction pooler"), e cada cópia mantém no máximo 3 conexões.
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

// "Pool" mantém várias conexões abertas e reaproveitáveis. É o jeito
// recomendado de usar o pg em uma API, em vez de abrir uma conexão nova
// a cada requisição (isso seria lento e não escalaria, RNF05).

module.exports = {
  // uso: const { rows } = await db.query('SELECT * FROM pins WHERE id = $1', [id]);
  query: (texto, params) => pool.query(texto, params),
  pool,
};
