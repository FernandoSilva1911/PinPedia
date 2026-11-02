// Ponto de entrada do backend: Express, frontend estático e rotas da API.

const express = require("express");
const path = require("path");
const cors = require("cors");
const db = require("./db");
const rotasUsuarios = require("./routes/usuarios");
const rotasPins = require("./routes/pins");
const { COLECOES } = require("./colecoes");
const { RESERVADOS } = require("./slug");

if (!process.env.JWT_SECRET) {
  console.error("ERRO: a variável JWT_SECRET não está definida (veja o .env.example).");
  // local, para o servidor; na Vercel mantém o mapa no ar e deixa o erro no log
  if (require.main === module) process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use(rotasUsuarios);
app.use(rotasPins);

app.get("/teste-db", async (req, res) => {
  try {
    const resultado = await db.query("SELECT NOW() AS agora");
    res.json({ status: "conectado", horario_do_banco: resultado.rows[0].agora });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ status: "erro", mensagem: "Não foi possível conectar ao banco." });
  }
});

const paginaInicial = (req, res) => res.sendFile(path.join(__dirname, "public", "index.html"));

// Páginas das coleções (/brasil) e dos autores (/fernando ou /1).
// O frontend lê o caminho e decide o que carregar.
Object.keys(COLECOES).forEach((slug) => app.get("/" + slug, paginaInicial));

app.get("/:endereco", (req, res, next) => {
  const endereco = req.params.endereco.toLowerCase();
  if (RESERVADOS.has(endereco) || endereco.includes(".")) return next();
  paginaInicial(req, res);
});

// Na Vercel o app é exportado como função (api/index.js), sem listen().
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
}

module.exports = app;
