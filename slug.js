// slug.js: monta o endereço público de cada usuário.
//
// O RF009 prevê que o mapa de um autor seja acessível por "/UrlDoUsuario".
// Este módulo transforma o nome informado no cadastro em um endereço utilizável
// e garante que ele não conflite com nada que já exista no site.

const { COLECOES } = require("./colecoes");

// Caminhos que não podem virar endereço de usuário, porque já pertencem à API
// ou às páginas de coleção. Sem esta lista, alguém que se cadastrasse como
// "Brasil" tomaria a página da coleção.
const RESERVADOS = new Set([
  "pins",
  "usuarios",
  "login",
  "colecoes",
  "teste-db",
  "api",
  "public",
  "favicon.ico",
  ...Object.keys(COLECOES),
]);

// "José da Silva" vira "jose-da-silva"
function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove os acentos separados pelo NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

// Endereço só de dígitos é proibido: colidiria com a rota por id, que continua
// funcionando para não quebrar links antigos.
function indisponivel(url) {
  return !url || RESERVADOS.has(url) || /^\d+$/.test(url);
}

// Procura um endereço livre, acrescentando um número ao final quando preciso.
async function gerarUrlUnica(db, nome) {
  const base = normalizar(nome) || "usuario";
  let candidato = base;
  let tentativa = 1;

  while (true) {
    if (!indisponivel(candidato)) {
      const existe = await db.query("SELECT 1 FROM usuarios WHERE url = $1", [candidato]);
      if (existe.rows.length === 0) return candidato;
    }
    tentativa += 1;
    candidato = base + "-" + tentativa;
  }
}

module.exports = { normalizar, indisponivel, gerarUrlUnica, RESERVADOS };
