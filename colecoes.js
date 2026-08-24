// colecoes.js: coleções temáticas de pins.
//
// Cada coleção tem uma página própria, no formato NomeDoSite/<slug>, que
// mostra apenas os pins marcados com aquele identificador na coluna "colecao"
// da tabela pins. É o mesmo mecanismo da visualização por autor (RF009), só
// que recortando por tema em vez de por pessoa.
//
// Para criar uma coleção nova basta acrescentar uma entrada aqui e marcar os
// pins com o slug correspondente. A rota da página e a da API passam a existir
// automaticamente.

const COLECOES = {
  brasil: {
    nome: "História do Brasil",
    descricao: "Do desembarque de Cabral ao fim do Império.",
    // Piso de data exclusivo desta coleção: o filtro não pode ir mais para
    // trás do que a chegada de Cabral. Pedidos abaixo disso são trazidos de
    // volta para o piso, em vez de recusados.
    dataMinima: "1500-04-22",
  },
};

module.exports = { COLECOES };
