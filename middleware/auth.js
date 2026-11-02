// Exige um token JWT válido no cabeçalho Authorization.

const jwt = require("jsonwebtoken");

function exigirAutenticacao(req, res, next) {
  const cabecalho = req.headers.authorization;

  if (!cabecalho || !cabecalho.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token de autenticação não informado." });
  }

  try {
    req.usuario = jwt.verify(cabecalho.split(" ")[1], process.env.JWT_SECRET);
    next();
  } catch (erro) {
    res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}

module.exports = { exigirAutenticacao };
