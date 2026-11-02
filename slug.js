// Endereço público de cada usuário (RF008), gerado a partir do nome.

const { COLECOES } = require("./colecoes");

// Caminhos que já pertencem à API ou às coleções.
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

// "José da Silva" -> "jose-da-silva"
function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

// Só dígitos não pode: colidiria com o acesso por id (/1).
function indisponivel(url) {
  return !url || RESERVADOS.has(url) || /^\d+$/.test(url);
}

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
    candidato = `${base}-${tentativa}`;
  }
}

module.exports = { normalizar, indisponivel, gerarUrlUnica, RESERVADOS };
