// server.js: ponto de entrada do backend.
// Monta o Express, serve o frontend da pasta public/ e registra as rotas
// da API (RF001 a RF009), que ficam em routes/.

const express = require("express");
const path = require("path");
const cors = require("cors");
const db = require("./db");
const rotasUsuarios = require("./routes/usuarios");
const rotasPins = require("./routes/pins");
const { COLECOES } = require("./colecoes");
const { RESERVADOS } = require("./slug");

// Sem o JWT_SECRET não dá para assinar nem validar login. Sem esta checagem o
// servidor sobe normalmente e só quebra na hora que alguém tenta entrar, com um
// erro 500 que não explica nada: o tipo de problema que só aparece na pior
// hora possível. Melhor gritar aqui, na subida.
if (!process.env.JWT_SECRET) {
  console.error(
    "\n*** ERRO DE CONFIGURAÇÃO: a variável JWT_SECRET não está definida. ***\n" +
      "  Rodando local : crie o arquivo .env a partir do .env.example.\n" +
      "  Na Vercel     : Settings > Environment Variables, e depois Redeploy.\n"
  );
  // Rodando local, para na hora, para o aviso não passar batido no meio do log.
  // Em produção (serverless) não derruba tudo: o mapa continua no ar e o erro
  // fica registrado no log da função.
  if (require.main === module) process.exit(1);
}

const app = express();
app.use(cors()); // libera o frontend (rodando em outra origem) a chamar essa API
app.use(express.json());

// serve o frontend (public/index.html) e seus arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

app.use(rotasUsuarios);
app.use(rotasPins);

// Rota de teste: acesse http://localhost:3000/teste-db no navegador
app.get("/teste-db", async (req, res) => {
  try {
    const resultado = await db.query("SELECT NOW() AS agora");
    res.json({
      status: "conectado",
      horario_do_banco: resultado.rows[0].agora,
    });
  } catch (erro) {
    // O detalhe do erro fica só no log do servidor. Ele costuma trazer host,
    // porta e usuário do banco. Como esta rota é pública, mandar isso na
    // resposta entregaria dados da infraestrutura para qualquer visitante.
    console.error(erro);
    res.status(500).json({
      status: "erro",
      mensagem: "Não foi possível conectar ao banco. Confira a variável DATABASE_URL.",
    });
  }
});

// Páginas das coleções temáticas, como /brasil. Assim como a rota do
// RF009, devolvem o mesmo index.html: é o frontend que lê o caminho e
// decide o que carregar. Ficam depois das rotas da API para não
// atropelar nenhuma delas.
Object.keys(COLECOES).forEach((slug) => {
  app.get("/" + slug, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });
});

// RF009, visualização de terceiros pelo endereço do autor: NomeDoSite/<url>,
// como /fernando. O id numérico também continua valendo, para não quebrar
// links antigos.
//
// Fica DEPOIS das rotas da API de propósito: /pins, /login, /teste-db e as
// demais já foram atendidas acima, e a lista de reservados barra o que
// sobrar. Quem tiver ponto no nome é arquivo estático que não existe, e
// segue para o 404 normal em vez de receber a página.
app.get("/:endereco", (req, res, next) => {
  const endereco = req.params.endereco;
  if (RESERVADOS.has(endereco) || endereco.includes(".")) return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Em produção (Vercel) este arquivo é importado por api/index.js, que entrega
// o `app` como função serverless, lá não existe um servidor ligado o tempo
// todo, então NÃO se deve chamar listen(). Por isso o listen só acontece
// quando este arquivo é executado diretamente, que é o caso do `npm start`
// no desenvolvimento local.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;

