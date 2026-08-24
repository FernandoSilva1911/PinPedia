// api/index.js: ponto de entrada da Vercel.
//
// A Vercel não mantém um servidor Express ligado: ela executa uma "função
// serverless", que é acordada a cada requisição. O que ela espera receber
// deste arquivo é justamente uma função (req, res), e um app do Express já
// é exatamente isso. Por isso aqui só reaproveitamos o app montado no
// server.js, sem duplicar nenhuma rota.
//
// O vercel.json manda todas as requisições para cá.
module.exports = require("../server.js");
