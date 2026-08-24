// middleware/auth.js: protege rotas que exigem usuário logado
// (vai ser usado depois nas rotas de criar/editar/excluir pin).

const jwt = require("jsonwebtoken");

function exigirAutenticacao(req, res, next) {
  const cabecalho = req.headers.authorization; // esperado: "Bearer <token>"

  if (!cabecalho || !cabecalho.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token de autenticação não informado." });
  }

  const token = cabecalho.split(" ")[1];

  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = dados; // { id, nome, email }, disponível nas rotas seguintes
    next();
  } catch (erro) {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}

module.exports = { exigirAutenticacao };
